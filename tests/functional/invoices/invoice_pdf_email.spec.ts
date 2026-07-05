import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import mail from '@adonisjs/mail/services/main'
import app from '@adonisjs/core/services/app'
import i18nManager from '@adonisjs/i18n/services/main'
import { DateTime } from 'luxon'
import { UserFactory } from '#database/factories/user_factory'
import OrganizationMembership from '#models/organization_membership'
import Organization from '#models/organization'
import Client from '#models/client'
import Invoice from '#models/invoice'
import InvoiceLine from '#models/invoice_line'
import InvoicePdfService from '#services/invoice_pdf_service'
import { createAdminUser } from '#tests/functional/helpers'

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

async function createInvoice(organizationId: number, opts: { clientId?: number } = {}) {
  const invoice = await Invoice.create({
    organizationId,
    clientId: opts.clientId ?? null,
    kind: 'quote',
    number: 'DEV-000001',
    clientName: 'Alice Martin',
    status: 'draft',
    issuedAt: DateTime.fromISO('2026-07-05'),
    subtotal: '100.00',
    taxRate: '20.00',
    taxAmount: '20.00',
    total: '120.00',
    currency: 'EUR',
  })
  await InvoiceLine.create({
    invoiceId: invoice.id,
    label: 'Location',
    quantity: '1',
    unitPrice: '100.00',
    amount: '100.00',
    position: 0,
  })
  return invoice
}

test.group('Invoice PDF & email (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  group.each.setup(() => {
    mail.fake()
  })
  group.each.teardown(() => mail.restore())

  test('InvoicePdfService generates a valid PDF buffer', async ({ assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await createInvoice(user.organizationId!)
    await invoice.load('lines')
    await invoice.load('client')
    const org = await Organization.findOrFail(user.organizationId!)

    const service = await app.container.make(InvoicePdfService)
    const { buffer, filename } = await service.generate(invoice, org, i18nManager.locale('en'))

    assert.isTrue(Buffer.isBuffer(buffer))
    assert.equal(buffer.subarray(0, 4).toString('ascii'), '%PDF')
    assert.isTrue(filename.endsWith('.pdf'))
  })

  test('downloads a PDF for an enterprise org', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await createInvoice(user.organizationId!)

    const response = await client.get(`/invoices/${invoice.id}/pdf`).loginAs(user)

    response.assertStatus(200)
    response.assertHeader('content-type', 'application/pdf')
    assert.isAbove(Number(response.header('content-length')), 500)
  })

  test('pdf download is org-scoped (IDOR)', async ({ client }) => {
    const user = await createEnterpriseAdminUser()
    const other = await createEnterpriseAdminUser()
    const foreign = await createInvoice(other.organizationId!)

    const response = await client.get(`/invoices/${foreign.id}/pdf`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/invoices')
  })

  test('pdf download is blocked for non-enterprise', async ({ client }) => {
    const user = await createAdminUser() // pro
    const invoice = await createInvoice(user.organizationId!)

    const response = await client.get(`/invoices/${invoice.id}/pdf`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')
  })

  test('sending the invoice marks it as sent and flashes success', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const c = await Client.create({
      organizationId: user.organizationId!,
      firstName: 'Alice',
      lastName: 'Martin',
      email: 'alice@example.com',
      status: 'active',
    })
    const invoice = await createInvoice(user.organizationId!, { clientId: c.id })

    const response = await client.post(`/invoices/${invoice.id}/send`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Document sent by email.')
    await invoice.refresh()
    assert.equal(invoice.status, 'sent')
  })

  test('refuses to send when the client has no email', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const c = await Client.create({
      organizationId: user.organizationId!,
      firstName: 'No',
      lastName: 'Email',
      email: null,
      status: 'active',
    })
    const invoice = await createInvoice(user.organizationId!, { clientId: c.id })

    const response = await client.post(`/invoices/${invoice.id}/send`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'This client does not have an email address.')
    await invoice.refresh()
    assert.equal(invoice.status, 'draft')
  })
})
