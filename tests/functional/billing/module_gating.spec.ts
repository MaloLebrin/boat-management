import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import OrganizationModuleService from '#services/organization_module_service'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser } from '#tests/functional/helpers'

/**
 * Accès aux écrans gatés par plan OU module add-on (épic #327).
 * `createAdminUser()` crée un admin d'une organisation en plan Pro.
 */
test.group('Module gating (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('pro without module is redirected to billing, never to the public marketing home', async ({
    client,
  }) => {
    const user = await createAdminUser()

    for (const path of ['/clients', '/invoices', '/pricing/seasons', '/reservations']) {
      const response = await client.get(path).loginAs(user)
      // `/` redirige sur `/en` (home marketing publique), dont le layout ne rend
      // aucun toast : l'utilisateur connecté y était éjecté sans explication (#456).
      response.assertRedirectsTo('/settings/billing')
    }
  })

  // Le module est vendable en add-on sur le socle Pro depuis #327 : le flash ne
  // doit plus prétendre que la fonctionnalité « nécessite le plan Entreprise ».
  test('each gated screen names the missing module and both ways to get it', async ({ client }) => {
    const user = await createAdminUser()

    const cases = [
      {
        path: '/clients',
        message:
          'Client management is part of the CRM & Invoicing module — included with Enterprise, or available as an add-on on the Pro plan.',
      },
      {
        path: '/invoices',
        message:
          'Quotes and invoices are part of the CRM & Invoicing module — included with Enterprise, or available as an add-on on the Pro plan.',
      },
      {
        path: '/pricing/seasons',
        message:
          'Seasonal pricing is part of the Charter module — included with Enterprise, or available as an add-on on the Pro plan.',
      },
      {
        path: '/reservations',
        message:
          'Reservations, inspections and rental contracts are part of the Charter module — included with Enterprise, or available as an add-on on the Pro plan.',
      },
    ]

    for (const { path, message } of cases) {
      // `.redirects(0)` : sans lui le client suit la redirection, la page
      // facturation consomme le flash et l'assertion ne voit plus rien.
      const response = await client.get(path).loginAs(user).redirects(0)
      response.assertStatus(302)
      response.assertFlashMessage('error', message)
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
    pricing.assertRedirectsTo('/settings/billing')

    // Les réservations relèvent du module Location (#595), pas du CRM.
    const reservations = await client.get('/reservations').loginAs(user)
    reservations.assertRedirectsTo('/settings/billing')
  })

  test('pro with charter module can access pricing seasons and reservations but not clients', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const service = new OrganizationModuleService()
    await service.grantModule(user.organizationId!, 'charter', { source: 'subscription' })

    const pricing = await client.get('/pricing/seasons').loginAs(user)
    pricing.assertStatus(200)

    const reservations = await client.get('/reservations').loginAs(user)
    reservations.assertStatus(200)

    const clients = await client.get('/clients').loginAs(user)
    clients.assertRedirectsTo('/settings/billing')
  })

  // Le gating couvre aussi les routes réservations par bateau (états des lieux,
  // contrats) : un deep-link ne doit pas contourner le module (#595).
  test('boat-level reservation routes are gated by the charter module too', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}/reservations`).loginAs(user)
    response.assertRedirectsTo('/settings/billing')

    const service = new OrganizationModuleService()
    await service.grantModule(user.organizationId!, 'charter', { source: 'subscription' })

    const granted = await client.get(`/boats/${boat.id}/reservations`).loginAs(user).withInertia()
    granted.assertStatus(200)
  })

  test('enterprise accesses reservations without any module', async ({ client }) => {
    const user = await createAdminUser()
    const org = await user.related('organization').query().firstOrFail()
    await org.merge({ plan: 'enterprise' }).save()

    const response = await client.get('/reservations').loginAs(user).withInertia()
    response.assertStatus(200)
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
