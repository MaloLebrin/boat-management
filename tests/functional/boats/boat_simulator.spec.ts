import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { createAdminUser, createBoatOwnerUser } from '#tests/functional/helpers'

/**
 * Tests de caractérisation de `BoatSimulatorController` (vague 0.4) : le
 * simulateur de coûts pré-rempli depuis la fiche d'un bateau existant.
 */

test.group('Simulateur depuis un bateau — GET /boats/:id/simulator (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('redirige vers /login sans authentification', async ({ client }) => {
    const response = await client.get('/boats/1/simulator').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('pré-remplit le simulateur avec le type, la catégorie et la présence de moteur', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({
      organizationId: admin.organizationId!,
      name: 'Mistral II',
      type: 'sailboat',
      navigationCategory: 'B',
      yearBuilt: 2005,
    }).create()
    await BoatEngineFactory.merge({ boatId: boat.id }).create()

    const response = await client.get(`/boats/${boat.id}/simulator`).loginAs(admin).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('boats/simulator')
    response.assertInertiaPropsContains({
      boat: { id: boat.id, name: 'Mistral II' },
      partial: {
        boatType: 'sailboat',
        navigationCategory: 'B',
        yearBuilt: 2005,
        hasDedicatedEngine: true,
      },
    })
    assert.isNotNull(response.inertiaProps)
  })

  test("un type de bateau inconnu du simulateur n'est pas transmis, sans moteur → false", async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({
      organizationId: admin.organizationId!,
      type: 'other',
    }).create()

    const response = await client.get(`/boats/${boat.id}/simulator`).loginAs(admin).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as { partial: Record<string, unknown> }
    assert.isUndefined(props.partial.boatType)
    assert.isFalse(props.partial.hasDedicatedEngine)
  })

  test("le bateau d'une autre organisation est introuvable (404)", async ({ client }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const attacker = await createAdminUser()

    const response = await client.get(`/boats/${boat.id}/simulator`).loginAs(attacker)

    response.assertStatus(404)
  })

  test('un propriétaire (sans boats.view) est refusé', async ({ client }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    await boat.related('owners').attach([owner.id])

    const response = await client.get(`/boats/${boat.id}/simulator`).loginAs(owner)

    response.assertStatus(403)
  })
})
