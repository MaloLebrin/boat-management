import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import OrganizationModuleService from '#services/organization_module_service'
import { createAdminUser } from '#tests/functional/helpers'

/**
 * Accès aux écrans gatés par plan OU module add-on (épic #327).
 * `createAdminUser()` crée un admin d'une organisation en plan Pro.
 */
test.group('Module gating (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('pro without module is redirected away from clients, invoices and pricing seasons', async ({
    client,
  }) => {
    const user = await createAdminUser()

    for (const path of ['/clients', '/invoices', '/pricing/seasons']) {
      const response = await client.get(path).loginAs(user)
      response.assertRedirectsTo('/')
    }
  })

  test('pro with crm_invoicing module can access clients and invoices but not pricing', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const service = new OrganizationModuleService()
    await service.grantModule(user.organizationId!, 'crm_invoicing', { source: 'subscription' })

    const clients = await client.get('/clients').loginAs(user)
    clients.assertStatus(200)

    const invoices = await client.get('/invoices').loginAs(user)
    invoices.assertStatus(200)

    const pricing = await client.get('/pricing/seasons').loginAs(user)
    pricing.assertRedirectsTo('/')
  })

  test('pro with charter module can access pricing seasons but not clients', async ({ client }) => {
    const user = await createAdminUser()
    const service = new OrganizationModuleService()
    await service.grantModule(user.organizationId!, 'charter', { source: 'subscription' })

    const pricing = await client.get('/pricing/seasons').loginAs(user)
    pricing.assertStatus(200)

    const clients = await client.get('/clients').loginAs(user)
    clients.assertRedirectsTo('/')
  })

  test('a granted module opens access exactly like a subscribed one', async ({ client }) => {
    const user = await createAdminUser()
    const service = new OrganizationModuleService()
    await service.grantModule(user.organizationId!, 'crm_invoicing', { source: 'granted' })

    const clients = await client.get('/clients').loginAs(user)
    clients.assertStatus(200)
  })

  test('shared Inertia props expose the active modules', async ({ client }) => {
    const user = await createAdminUser()
    const service = new OrganizationModuleService()
    await service.grantModule(user.organizationId!, 'charter', { source: 'subscription' })

    const response = await client.get('/dashboard').loginAs(user).withInertia()
    response.assertInertiaPropsContains({ activeModules: ['charter'] })
  })
})
