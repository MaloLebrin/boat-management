import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Port from '#models/port'
import Pontoon from '#models/pontoon'
import { PortFactory } from '#database/factories/port_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import { MouillageFactory } from '#database/factories/mouillage_factory'
import { SpotFactory } from '#database/factories/spot_factory'
import {
  createAdminUser,
  createProPlanUser,
  createStarterPlanUser,
} from '#tests/functional/helpers'

/**
 * #604 — la cartographie de port (ports, pontons, mouillages, places) n'a pas
 * d'objet sur le plan individuel : `RequirePortsPlanMiddleware` ferme tout le
 * groupe de routes `/ports/*` au plan Starter.
 */
test.group('Ports — garde de plan (#604)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /ports redirige un plan Starter vers la facturation', async ({ client }) => {
    const user = await createStarterPlanUser()

    const response = await client.get('/ports').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/settings/billing')
  })

  test('GET /ports/new est fermé au plan Starter', async ({ client }) => {
    const user = await createStarterPlanUser()

    const response = await client.get('/ports/new').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/settings/billing')
  })

  test('POST /ports ne crée pas de port sur un plan Starter', async ({ client, assert }) => {
    const user = await createStarterPlanUser()

    const response = await client
      .post('/ports')
      .loginAs(user)
      .form({ name: 'Port Interdit' })
      .redirects(0)

    response.assertHeader('location', '/settings/billing')
    assert.isNull(await Port.findBy('name', 'Port Interdit'))
  })

  test('GET /ports/:id est fermé au plan Starter même sur un port de son org', async ({
    client,
  }) => {
    const user = await createStarterPlanUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/ports/${port.id}`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/settings/billing')
  })

  test('DELETE /ports/:id ne supprime pas sur un plan Starter', async ({ client, assert }) => {
    const user = await createStarterPlanUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    await client.delete(`/ports/${port.id}`).loginAs(user).redirects(0)

    assert.isNotNull(await Port.find(port.id))
  })

  test('POST /ports/:portId/pontoons est fermé au plan Starter', async ({ client, assert }) => {
    const user = await createStarterPlanUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/ports/${port.id}/pontoons`)
      .loginAs(user)
      .form({ name: 'Ponton A' })
      .redirects(0)

    response.assertHeader('location', '/settings/billing')
    assert.isNull(await Pontoon.findBy('name', 'Ponton A'))
  })

  test('POST /ports/:portId/mouillages est fermé au plan Starter', async ({ client }) => {
    const user = await createStarterPlanUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/ports/${port.id}/mouillages`)
      .loginAs(user)
      .form({ name: 'Mouillage Nord' })
      .redirects(0)

    response.assertHeader('location', '/settings/billing')
  })

  test('PUT /spots/:id est fermé au plan Starter', async ({ client }) => {
    const user = await createStarterPlanUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const mouillage = await MouillageFactory.merge({ portId: port.id }).create()
    const spot = await SpotFactory.merge({
      mouillageId: mouillage.id,
      organizationId: user.organizationId!,
    }).create()

    const response = await client.put(`/spots/${spot.id}`).loginAs(user).form({}).redirects(0)

    response.assertHeader('location', '/settings/billing')
  })

  test('GET /ports reste ouvert au plan Pro', async ({ client }) => {
    const user = await createProPlanUser()

    const response = await client.get('/ports').loginAs(user)

    response.assertStatus(200)
  })

  test('POST /ports/:portId/pontoons reste ouvert au plan Pro', async ({ client, assert }) => {
    // `createAdminUser` : org au plan `pro` ET membership admin — l'écriture
    // exige la capability `pontoons.create` en plus du plan.
    const user = await createAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    await client.post(`/ports/${port.id}/pontoons`).loginAs(user).form({ name: 'Ponton Pro' })

    assert.isNotNull(await Pontoon.findBy('name', 'Ponton Pro'))
  })

  test("la redirection prime sur l'authentification manquante", async ({ client }) => {
    const response = await client.get('/ports').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('un port existant reste invisible du formulaire bateau sur un plan Starter', async ({
    client,
    assert,
  }) => {
    // Rétrogradation Pro → Starter : les données restent en base, mais aucune
    // surface ne les propose plus (le sélecteur de place s'escamote seul).
    const user = await createStarterPlanUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
    await SpotFactory.merge({
      pontoonId: pontoon.id,
      organizationId: user.organizationId!,
    }).create()

    const response = await client.get('/boats/new').loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as { ports: unknown[]; portOptions: unknown[] }
    assert.deepEqual(props.ports, [])
    assert.deepEqual(props.portOptions, [])
  })
})
