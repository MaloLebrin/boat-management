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
    family: 'outboard_4t',
    brand: 'Yamaha',
    model: '6E0',
  }).create()
}

/** In-bord diesel en ligne d'arbre — la motorisation ouverte par #574. */
async function makeInboardDieselEngine(boatId: number) {
  return BoatEngineFactory.merge({
    boatId,
    kind: 'inboard',
    fuel: 'diesel',
    family: 'inboard_diesel_shaft',
    brand: 'Volvo Penta',
    model: 'D2-40',
  }).create()
}

test.group('Spare parts pages (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /spare-parts requires authentication', async ({ client }) => {
    const response = await client.get('/spare-parts').redirects(0)

    response.assertStatus(302)
  })

  // Depuis #574 l'éligibilité vient de la famille de motorisation, plus du seul
  // `kind === 'outboard'` : l'in-bord diesel a désormais sa nomenclature.
  test('GET /spare-parts lists the engines of the user org, outboard and inboard', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const outboard = await makeEligibleEngine(boat.id)
    const inboard = await makeInboardDieselEngine(boat.id)

    const otherUser = await createAdminUser()
    const otherBoat = await BoatFactory.merge({
      organizationId: otherUser.organizationId!,
    }).create()
    await makeEligibleEngine(otherBoat.id)

    const response = await client.get('/spare-parts').loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('spare_parts/index')
    const props = response.inertiaProps as {
      engines: Array<{ id: number; family: string | null; cartCount: number }>
    }
    assert.deepEqual(
      props.engines.map((engine) => engine.id).sort(),
      [outboard.id, inboard.id].sort()
    )
    assert.deepEqual(props.engines.map((engine) => engine.family).sort(), [
      'inboard_diesel_shaft',
      'outboard_4t',
    ])
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

  test('GET identify opens the parts screen on an inboard diesel (#574)', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeInboardDieselEngine(boat.id)

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts`)
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('spare_parts/identify')
    const props = response.inertiaProps as { engine: { family: string | null } }
    assert.equal(props.engine.family, 'inboard_diesel_shaft')
  })

  test('GET assembly serves an inboard assembly to an inboard engine', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeInboardDieselEngine(boat.id)

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts/assemblies/saildrive`)
      .loginAs(user)
      .redirects(0)

    // Un D2-40 en ligne d'arbre n'a pas de saildrive : l'ensemble existe, mais
    // pas pour cette famille.
    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}/engines/${engine.id}/spare-parts`)

    const injection = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts/assemblies/injection`)
      .loginAs(user)
      .withInertia()

    injection.assertStatus(200)
    injection.assertInertiaComponent('spare_parts/assembly')
    const props = injection.inertiaProps as { assemblySlug: string }
    assert.equal(props.assemblySlug, 'injection')
  })

  test('GET assembly refuses an outboard assembly on an inboard engine', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeInboardDieselEngine(boat.id)

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts/assemblies/carburetor`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}/engines/${engine.id}/spare-parts`)
    response.assertFlashMessage('error', 'Part assembly not found for this motorisation.')
  })

  test('a repair cart created before #574 stays readable and exportable', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)
    // Clés du corpus #517 : elles sont persistées, jamais renommées.
    await BoatEngineRepairCartItem.create({
      boatEngineId: engine.id,
      partKey: 'carburetor.repair_kit',
      quantity: 1,
    })
    await BoatEngineRepairCartItem.create({
      boatEngineId: engine.id,
      partKey: 'lower-unit.impeller',
      quantity: 3,
      reference: '6E0-44352-00',
    })

    const page = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts`)
      .loginAs(user)
      .withInertia()

    const props = page.inertiaProps as { cartItems: Array<{ partKey: string }> }
    assert.deepEqual(
      props.cartItems.map((item) => item.partKey),
      ['carburetor.repair_kit', 'lower-unit.impeller']
    )

    const csv = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts/cart/export`)
      .loginAs(user)

    csv.assertStatus(200)
    assert.include(csv.text(), '6E0-44352-00')
    assert.include(csv.text(), 'IMPELLER')
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
    response.assertFlashMessage('error', 'Part assembly not found for this motorisation.')
  })
})
