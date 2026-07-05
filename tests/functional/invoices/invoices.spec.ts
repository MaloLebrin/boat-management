import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import OrganizationMembership from '#models/organization_membership'
import BoatReservation from '#models/boat_reservation'
import Client from '#models/client'
import Invoice from '#models/invoice'
import InvoiceLine from '#models/invoice_line'
import { createAdminUser } from '#tests/functional/helpers'
import { DateTime } from 'luxon'

async function createEnterpriseAdminUser() {
  const user = await UserFactory.with('organization', 1, (org) =>
    org.merge({ plan: 'enterprise' })
  ).create()
  if (user.organizationId) {
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: user.organizationId,
      role: 'admin',
    })
  }
  return user
}

/** A valid create payload with two lines, using bracketed form keys for the nested array. */
function invoiceForm(overrides: Record<string, unknown> = {}) {
  return {
    'kind': 'quote',
    'issuedAt': '2026-07-05',
    'taxRate': 20,
    'lines[0][label]': 'Location semaine',
    'lines[0][quantity]': 2,
    'lines[0][unitPrice]': 100,
    'lines[1][label]': 'Option ménage',
    'lines[1][quantity]': 1,
    'lines[1][unitPrice]': 50,
    ...overrides,
  }
}

test.group('Invoices (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('store creates an invoice with lines and server-computed totals', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()

    const response = await client.post('/invoices').loginAs(user).form(invoiceForm()).redirects(0)
    response.assertStatus(302)

    const invoice = await Invoice.query()
      .where('organizationId', user.organizationId!)
      .preload('lines', (q) => q.orderBy('position'))
      .firstOrFail()

    assert.equal(invoice.number, 'DEV-000001')
    assert.equal(invoice.kind, 'quote')
    assert.equal(invoice.status, 'draft')
    assert.equal(Number(invoice.subtotal), 250)
    assert.equal(Number(invoice.taxAmount), 50)
    assert.equal(Number(invoice.total), 300)
    assert.lengthOf(invoice.lines, 2)
    assert.equal(Number(invoice.lines[0].amount), 200)
    assert.equal(Number(invoice.lines[1].amount), 50)
  })

  test('store snapshots the client name', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const c = await Client.create({
      organizationId: user.organizationId!,
      firstName: 'Alice',
      lastName: 'Martin',
      status: 'active',
    })

    await client
      .post('/invoices')
      .loginAs(user)
      .form(invoiceForm({ clientId: c.id }))
      .redirects(0)

    const invoice = await Invoice.query()
      .where('organizationId', user.organizationId!)
      .firstOrFail()
    assert.equal(invoice.clientId, c.id)
    assert.equal(invoice.clientName, 'Alice Martin')
  })

  test('ignores a client and reservation from another organization', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    // Foreign org resources
    const other = await createEnterpriseAdminUser()
    const foreignClient = await Client.create({
      organizationId: other.organizationId!,
      firstName: 'Foreign',
      lastName: 'Client',
      status: 'active',
    })
    const foreignBoat = await BoatFactory.merge({
      organizationId: other.organizationId!,
    }).create()
    const foreignReservation = await BoatReservation.create({
      boatId: foreignBoat.id,
      organizationId: other.organizationId!,
      status: 'option',
      startsAt: DateTime.fromISO('2026-07-01T10:00'),
      endsAt: DateTime.fromISO('2026-07-04T10:00'),
      clientName: 'Foreign',
    })

    await client
      .post('/invoices')
      .loginAs(user)
      .form(invoiceForm({ clientId: foreignClient.id, reservationId: foreignReservation.id }))
      .redirects(0)

    const invoice = await Invoice.query()
      .where('organizationId', user.organizationId!)
      .firstOrFail()
    assert.isNull(invoice.clientId)
    assert.isNull(invoice.clientName)
    assert.isNull(invoice.reservationId)
  })

  test('numbers are sequential per kind and independent', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    for (let i = 0; i < 3; i++) {
      await client
        .post('/invoices')
        .loginAs(user)
        .form(invoiceForm({ kind: 'quote' }))
        .redirects(0)
    }
    await client
      .post('/invoices')
      .loginAs(user)
      .form(invoiceForm({ kind: 'invoice' }))
      .redirects(0)
    await client
      .post('/invoices')
      .loginAs(user)
      .form(invoiceForm({ kind: 'invoice' }))
      .redirects(0)

    const quotes = await Invoice.query()
      .where('organizationId', user.organizationId!)
      .where('kind', 'quote')
      .orderBy('id')
    const invoices = await Invoice.query()
      .where('organizationId', user.organizationId!)
      .where('kind', 'invoice')
      .orderBy('id')

    assert.deepEqual(
      quotes.map((q) => q.number),
      ['DEV-000001', 'DEV-000002', 'DEV-000003']
    )
    assert.deepEqual(
      invoices.map((i) => i.number),
      ['FAC-000001', 'FAC-000002']
    )
  })

  test('a deleted number is never reused (gap-free counter)', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    await client
      .post('/invoices')
      .loginAs(user)
      .form(invoiceForm({ kind: 'quote' }))
      .redirects(0)
    const first = await Invoice.query().where('organizationId', user.organizationId!).firstOrFail()
    assert.equal(first.number, 'DEV-000001')

    await client.delete(`/invoices/${first.id}`).loginAs(user).redirects(0)

    await client
      .post('/invoices')
      .loginAs(user)
      .form(invoiceForm({ kind: 'quote' }))
      .redirects(0)
    const second = await Invoice.query()
      .where('organizationId', user.organizationId!)
      .orderBy('id', 'desc')
      .firstOrFail()
    assert.equal(second.number, 'DEV-000002')
  })

  test('update replaces lines, recomputes totals and keeps the number', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    await client.post('/invoices').loginAs(user).form(invoiceForm()).redirects(0)
    const invoice = await Invoice.query()
      .where('organizationId', user.organizationId!)
      .firstOrFail()

    await client
      .put(`/invoices/${invoice.id}`)
      .loginAs(user)
      .form({
        'kind': 'quote',
        'issuedAt': '2026-07-05',
        'taxRate': 10,
        'lines[0][label]': 'Forfait',
        'lines[0][quantity]': 1,
        'lines[0][unitPrice]': 500,
      })
      .redirects(0)

    await invoice.refresh()
    const lines = await InvoiceLine.query().where('invoiceId', invoice.id)
    assert.equal(invoice.number, 'DEV-000001') // unchanged
    assert.lengthOf(lines, 1)
    assert.equal(Number(invoice.subtotal), 500)
    assert.equal(Number(invoice.taxAmount), 50)
    assert.equal(Number(invoice.total), 550)
  })

  test('destroy cascades to lines', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    await client.post('/invoices').loginAs(user).form(invoiceForm()).redirects(0)
    const invoice = await Invoice.query()
      .where('organizationId', user.organizationId!)
      .firstOrFail()

    await client.delete(`/invoices/${invoice.id}`).loginAs(user).redirects(0)

    assert.isNull(await Invoice.find(invoice.id))
    const lines = await InvoiceLine.query().where('invoiceId', invoice.id)
    assert.lengthOf(lines, 0)
  })

  test('index lists only current-org invoices', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    await client.post('/invoices').loginAs(user).form(invoiceForm()).redirects(0)

    const other = await createEnterpriseAdminUser()
    await client.post('/invoices').loginAs(other).form(invoiceForm()).redirects(0)

    const response = await client.get('/invoices').loginAs(user).withInertia()
    response.assertStatus(200)
    const props = response.inertiaProps as { invoices: { data: Array<{ id: number }> } }
    assert.lengthOf(props.invoices.data, 1)
  })

  test('cannot update an invoice from another organization (IDOR)', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const other = await createEnterpriseAdminUser()
    await client.post('/invoices').loginAs(other).form(invoiceForm()).redirects(0)
    const foreign = await Invoice.query()
      .where('organizationId', other.organizationId!)
      .firstOrFail()

    const response = await client
      .put(`/invoices/${foreign.id}`)
      .loginAs(user)
      .form(invoiceForm({ taxRate: 0 }))
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/invoices')
    await foreign.refresh()
    assert.equal(Number(foreign.taxRate), 20) // unchanged
  })

  test('non-enterprise org is blocked with flash', async ({ client, assert }) => {
    const user = await createAdminUser() // pro plan

    const index = await client.get('/invoices').loginAs(user).redirects(0)
    index.assertStatus(302)
    index.assertHeader('location', '/')
    index.assertFlashMessage('error', 'This feature requires the Enterprise plan.')

    await client.post('/invoices').loginAs(user).form(invoiceForm()).redirects(0)
    assert.lengthOf(await Invoice.all(), 0)
  })

  test('unauthenticated user is redirected to login', async ({ client }) => {
    const response = await client.get('/invoices')
    response.assertRedirectsTo('/login')
  })
})
