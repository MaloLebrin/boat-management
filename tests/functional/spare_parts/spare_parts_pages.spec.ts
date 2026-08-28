import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import BoatEngineRepairCartItem from '#models/boat_engine_repair_cart_item'
import { createAdminUser } from '#tests/functional/helpers'

async function makeEligibleEngine(boatId: number) {
  return BoatEngineFactory.merge({
    boatId,
    kind: 'outboard',
    brand: 'Yamaha',
    model: '6E0',
  }).create()
}

test.group('Spare parts pages (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /spare-parts requires authentication', async ({ client }) => {
    const response = await client.get('/spare-parts').redirects(0)

    response.assertStatus(302)
  })

  test('GET /spare-parts lists only outboard engines of the user org', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const eligible = await makeEligibleEngine(boat.id)
    await BoatEngineFactory.merge({ boatId: boat.id, kind: 'inboard' }).create()

    const otherUser = await createAdminUser()
    const otherBoat = await BoatFactory.merge({
      organizationId: otherUser.organizationId!,
    }).create()
    await makeEligibleEngine(otherBoat.id)

    const response = await client.get('/spare-parts').loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('spare_parts/index')
    const props = response.inertiaProps as { engines: Array<{ id: number; cartCount: number }> }
    assert.deepEqual(
      props.engines.map((engine) => engine.id),
      [eligible.id]
    )
  })

  test('GET /spare-parts reports the repair cart size per engine', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)
    await BoatEngineRepairCartItem.create({
      boatEngineId: engine.id,
      partKey: 'carburetor.repair_kit',
      quantity: 1,
    })
    await BoatEngineRepairCartItem.create({
      boatEngineId: engine.id,
      partKey: 'lower-unit.impeller',
      quantity: 2,
    })

    const response = await client.get('/spare-parts').loginAs(user).withInertia()

    const props = response.inertiaProps as { engines: Array<{ id: number; cartCount: number }> }
    assert.equal(props.engines[0].cartCount, 2)
  })

  test('GET identify renders engine identity and cart items', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)
    await BoatEngineRepairCartItem.create({
      boatEngineId: engine.id,
      partKey: 'unreferenced.shear_pin',
      quantity: 1,
    })

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts`)
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('spare_parts/identify')
    const props = response.inertiaProps as {
      engine: { id: number; model: string | null; serialNumber: string | null }
      cartItems: Array<{ partKey: string }>
      canManage: boolean
    }
    assert.equal(props.engine.id, engine.id)
    assert.equal(props.engine.model, '6E0')
    assert.isString(props.engine.serialNumber)
    assert.deepEqual(
      props.cartItems.map((item) => item.partKey),
      ['unreferenced.shear_pin']
    )
    assert.isTrue(props.canManage)
  })

  test('GET identify on an ineligible engine redirects with a flash', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, kind: 'inboard' }).create()

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}/engines/${engine.id}`)
    response.assertFlashMessage('error', 'Part identification only applies to outboard engines.')
  })

  test('GET identify on a boat from another org redirects to /boats', async ({ client }) => {
    const user = await createAdminUser()
    const otherUser = await createAdminUser()
    const otherBoat = await BoatFactory.merge({
      organizationId: otherUser.organizationId!,
    }).create()
    const engine = await makeEligibleEngine(otherBoat.id)

    const response = await client
      .get(`/boats/${otherBoat.id}/engines/${engine.id}/spare-parts`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
  })

  test('GET assembly renders a known assembly', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts/assemblies/carburetor`)
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('spare_parts/assembly')
    const props = response.inertiaProps as { assemblySlug: string }
    assert.equal(props.assemblySlug, 'carburetor')
  })

  test('GET assembly with an unknown slug redirects to identify with a flash', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts/assemblies/not-an-assembly`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}/engines/${engine.id}/spare-parts`)
    response.assertFlashMessage('error', 'Part assembly not found.')
  })
})
