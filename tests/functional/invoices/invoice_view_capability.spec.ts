import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Invoice from '#models/invoice'
import OrganizationMembership from '#models/organization_membership'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser, createBoatOwnerUser, createMemberUser } from '#tests/functional/helpers'

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

async function createInvoice(organizationId: number, number = 'DEV-000001') {
  return Invoice.create({
    organizationId,
    clientId: null,
    kind: 'quote',
    number,
    clientName: 'Alice Martin',
    status: 'draft',
    issuedAt: DateTime.fromISO('2026-01-01'),
    dueAt: null,
    paidAt: null,
    sourceQuoteId: null,
    subtotal: '100.00',
    taxRate: '20.00',
    taxAmount: '20.00',
    total: '120.00',
    currency: 'EUR',
  })
}

test.group('Invoices — invoices.view capability (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('member (regression) can still list, view and download invoices', async ({
    client,
    assert,
  }) => {
    const admin = await createEnterpriseAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const invoice = await createInvoice(admin.organizationId!)

    const indexResponse = await client.get('/invoices').loginAs(member)
    indexResponse.assertStatus(200)

    const showResponse = await client.get(`/invoices/${invoice.id}`).loginAs(member)
    showResponse.assertStatus(200)

    const pdfResponse = await client.get(`/invoices/${invoice.id}/pdf`).loginAs(member)
    pdfResponse.assertStatus(200)
    assert.equal(pdfResponse.headers()['content-type'], 'application/pdf')
  })

  test('boat_owner cannot access the staff invoices list or a single invoice', async ({
    client,
  }) => {
    const admin = await createAdminUser()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    const invoice = await createInvoice(admin.organizationId!)

    const indexResponse = await client.get('/invoices').loginAs(owner)
    indexResponse.assertStatus(403)

    const showResponse = await client.get(`/invoices/${invoice.id}`).loginAs(owner)
    showResponse.assertStatus(403)
  })

  test('a member from another organization cannot view a foreign invoice', async ({ client }) => {
    const admin = await createEnterpriseAdminUser()
    const invoice = await createInvoice(admin.organizationId!)

    // Enterprise plan so the request reaches the invoice ownership check
    // instead of being blocked earlier by the invoices-module quota gate.
    const otherAdmin = await createEnterpriseAdminUser()

    const response = await client.get(`/invoices/${invoice.id}`).loginAs(otherAdmin).redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Invoice not found.')
  })
})
