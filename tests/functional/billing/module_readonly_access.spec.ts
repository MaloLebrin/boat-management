import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Client from '#models/client'
import Invoice from '#models/invoice'
import OrganizationModuleService from '#services/organization_module_service'
import { createAdminUser } from '#tests/functional/helpers'

/**
 * Accès résiduel en lecture seule après résiliation du module CRM & Facturation
 * (#332, lot 5b). `createAdminUser()` = admin d'une org Pro SANS le module.
 * On simule des données historiques (créées quand le module était actif).
 */
test.group('Module read-only residual access — clients (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function seedClient(organizationId: number) {
    return Client.create({
      organizationId,
      firstName: 'Alice',
      lastName: 'Martin',
      status: 'active',
    })
  }

  test('read access is granted when the org has existing clients', async ({ client }) => {
    const user = await createAdminUser()
    await seedClient(user.organizationId!)

    const index = await client.get('/clients').loginAs(user).withInertia()
    index.assertStatus(200)
    index.assertInertiaPropsContains({ readOnly: true, canDelete: false })
  })

  test('read access is denied when the org has no clients and no module', async ({ client }) => {
    const user = await createAdminUser()

    const index = await client.get('/clients').loginAs(user).redirects(0)
    index.assertStatus(302)
    index.assertHeader('location', '/')
  })

  test('writing is blocked even with existing clients (module inactive)', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    await seedClient(user.organizationId!)

    const store = await client
      .post('/clients')
      .loginAs(user)
      .form({ firstName: 'Bob', lastName: 'Nope' })
      .redirects(0)
    store.assertStatus(302)
    store.assertHeader('location', '/')

    const count = await Client.query().where('organizationId', user.organizationId!).count('* as t')
    assert.equal(Number(count[0].$extras.t), 1) // no new client created
  })

  test('read-only access disappears once the module is (re)granted → full manage', async ({
    client,
  }) => {
    const user = await createAdminUser()
    await seedClient(user.organizationId!)
    await new OrganizationModuleService().grantModule(user.organizationId!, 'crm_invoicing', {
      source: 'subscription',
      stripeSubscriptionItemId: 'si_x',
    })

    const index = await client.get('/clients').loginAs(user).withInertia()
    index.assertStatus(200)
    index.assertInertiaPropsContains({ readOnly: false })
  })
})

test.group('Module read-only residual access — invoices (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function seedInvoice(organizationId: number) {
    return Invoice.create({
      organizationId,
      kind: 'invoice',
      number: 'FAC-000001',
      clientName: 'Alice Martin',
      status: 'draft',
      issuedAt: DateTime.fromISO('2026-07-05'),
      subtotal: '0.00',
      taxRate: '0.00',
      taxAmount: '0.00',
      total: '0.00',
      currency: 'EUR',
    })
  }

  test('index is read-only when the org has existing invoices', async ({ client }) => {
    const user = await createAdminUser()
    await seedInvoice(user.organizationId!)

    const index = await client.get('/invoices').loginAs(user).withInertia()
    index.assertStatus(200)
    index.assertInertiaPropsContains({ readOnly: true, canDelete: false })
  })

  test('creating an invoice is blocked when the module is inactive', async ({ client }) => {
    const user = await createAdminUser()
    await seedInvoice(user.organizationId!)

    const create = await client.get('/invoices/new').loginAs(user).redirects(0)
    create.assertStatus(302)
    create.assertHeader('location', '/')
  })
})
