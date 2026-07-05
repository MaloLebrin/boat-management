import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import { UserFactory } from '#database/factories/user_factory'
import OrganizationMembership from '#models/organization_membership'
import Invoice from '#models/invoice'
import InvoiceLine from '#models/invoice_line'
import InvoiceService from '#services/invoice_service'
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

interface InvoiceOpts {
  kind?: 'quote' | 'invoice'
  number?: string
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  dueAt?: string | null
  paidAt?: string | null
  sourceQuoteId?: number | null
}

async function createDocument(organizationId: number, opts: InvoiceOpts = {}) {
  const invoice = await Invoice.create({
    organizationId,
    clientId: null,
    kind: opts.kind ?? 'quote',
    number: opts.number ?? 'DEV-000001',
    clientName: 'Alice Martin',
    status: opts.status ?? 'draft',
    issuedAt: DateTime.fromISO('2026-01-01'),
    dueAt: opts.dueAt ? DateTime.fromISO(opts.dueAt) : null,
    paidAt: opts.paidAt ? DateTime.fromISO(opts.paidAt) : null,
    sourceQuoteId: opts.sourceQuoteId ?? null,
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

test.group('Invoice lifecycle (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('converts a quote into a new invoice linked to the origin', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const quote = await createDocument(user.organizationId!, { kind: 'quote' })

    const response = await client.post(`/invoices/${quote.id}/convert`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Quote converted to invoice.')

    const created = await Invoice.query()
      .where('kind', 'invoice')
      .where('sourceQuoteId', quote.id)
      .preload('lines')
      .firstOrFail()

    assert.match(created.number, /^FAC-\d{6}$/)
    assert.equal(created.status, 'draft')
    assert.equal(created.clientName, 'Alice Martin')
    assert.equal(created.total, '120.00')
    assert.lengthOf(created.lines, 1)
    assert.equal(created.lines[0].label, 'Location')
    // The redirect points to the new invoice, not the quote.
    response.assertHeader('location', `/invoices/${created.id}`)
  })

  test('refuses to convert a document that is not a quote', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await createDocument(user.organizationId!, {
      kind: 'invoice',
      number: 'FAC-000001',
    })

    const response = await client.post(`/invoices/${invoice.id}/convert`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Only quotes can be converted to an invoice.')
    // No invoice was created from it.
    const converted = await Invoice.query().where('sourceQuoteId', invoice.id)
    assert.lengthOf(converted, 0)
  })

  test('refuses to convert the same quote twice', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const quote = await createDocument(user.organizationId!, { kind: 'quote' })

    await client.post(`/invoices/${quote.id}/convert`).loginAs(user).redirects(0)
    const second = await client.post(`/invoices/${quote.id}/convert`).loginAs(user).redirects(0)

    second.assertStatus(302)
    second.assertFlashMessage('error', 'This quote has already been converted to an invoice.')

    const converted = await Invoice.query().where('sourceQuoteId', quote.id)
    assert.lengthOf(converted, 1)
  })

  test('conversion is org-scoped (IDOR)', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const other = await createEnterpriseAdminUser()
    const foreignQuote = await createDocument(other.organizationId!, { kind: 'quote' })

    const response = await client
      .post(`/invoices/${foreignQuote.id}/convert`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/invoices')
    const converted = await Invoice.query().where('sourceQuoteId', foreignQuote.id)
    assert.lengthOf(converted, 0)
  })

  test('marks an invoice as paid and stamps the payment date', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await createDocument(user.organizationId!, {
      kind: 'invoice',
      number: 'FAC-000001',
      status: 'sent',
    })

    const response = await client.post(`/invoices/${invoice.id}/pay`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Invoice marked as paid.')
    await invoice.refresh()
    assert.equal(invoice.status, 'paid')
    assert.isNotNull(invoice.paidAt)
  })

  test('refuses to mark a quote as paid', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const quote = await createDocument(user.organizationId!, { kind: 'quote' })

    const response = await client.post(`/invoices/${quote.id}/pay`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'This document cannot be marked as paid.')
    await quote.refresh()
    assert.equal(quote.status, 'draft')
    assert.isNull(quote.paidAt)
  })

  test('lifecycle actions are blocked for non-enterprise plans', async ({ client }) => {
    const user = await createAdminUser() // pro
    const quote = await createDocument(user.organizationId!, { kind: 'quote' })

    const response = await client.post(`/invoices/${quote.id}/convert`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')
  })

  test('markOverdueInvoices flips only sent, unpaid, past-due invoices', async ({ assert }) => {
    const user = await createEnterpriseAdminUser()
    const orgId = user.organizationId!

    const overdue = await createDocument(orgId, {
      kind: 'invoice',
      number: 'FAC-000001',
      status: 'sent',
      dueAt: '2026-01-15',
    })
    const draftPastDue = await createDocument(orgId, {
      kind: 'invoice',
      number: 'FAC-000002',
      status: 'draft',
      dueAt: '2026-01-15',
    })
    const futureDue = await createDocument(orgId, {
      kind: 'invoice',
      number: 'FAC-000003',
      status: 'sent',
      dueAt: '2026-12-31',
    })
    const alreadyPaid = await createDocument(orgId, {
      kind: 'invoice',
      number: 'FAC-000004',
      status: 'sent',
      dueAt: '2026-01-15',
      paidAt: '2026-01-10',
    })

    const service = await app.container.make(InvoiceService)
    const updated = await service.markOverdueInvoices(DateTime.fromISO('2026-06-01'))

    assert.equal(updated, 1)
    await overdue.refresh()
    await draftPastDue.refresh()
    await futureDue.refresh()
    await alreadyPaid.refresh()
    assert.equal(overdue.status, 'overdue')
    assert.equal(draftPastDue.status, 'draft')
    assert.equal(futureDue.status, 'sent')
    assert.equal(alreadyPaid.status, 'sent')
  })
})
