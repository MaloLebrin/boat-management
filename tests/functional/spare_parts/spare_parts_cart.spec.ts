import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import BoatEngineRepairCartItem from '#models/boat_engine_repair_cart_item'
import { createAdminUser, createBoatOwnerUser, createMechanicUser } from '#tests/functional/helpers'

async function makeEligibleEngine(boatId: number) {
  return BoatEngineFactory.merge({
    boatId,
    kind: 'outboard',
    brand: 'Yamaha',
    model: '6E0',
  }).create()
}

async function itemsFor(engineId: number) {
  return BoatEngineRepairCartItem.query().where('boatEngineId', engineId).orderBy('id', 'asc')
}

test.group('Spare parts repair cart (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('POST cart creates the item, then increments quantity on repeat', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)

    const url = `/boats/${boat.id}/engines/${engine.id}/spare-parts/cart`
    const first = await client
      .post(url)
      .loginAs(user)
      .form({ partKey: 'carburetor.repair_kit' })
      .redirects(0)
    first.assertStatus(302)

    await client.post(url).loginAs(user).form({ partKey: 'carburetor.repair_kit' }).redirects(0)

    const items = await itemsFor(engine.id)
    assert.lengthOf(items, 1)
    assert.equal(items[0].partKey, 'carburetor.repair_kit')
    assert.equal(items[0].quantity, 2)
  })

  test('POST cart with an unknown partKey flashes an error and stores nothing', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)

    const response = await client
      .post(`/boats/${boat.id}/engines/${engine.id}/spare-parts/cart`)
      .loginAs(user)
      .form({ partKey: 'carburetor.not_a_part' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Unknown catalog part.')
    assert.lengthOf(await itemsFor(engine.id), 0)
  })

  test('POST cart accepts an unreferenced part key', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)

    await client
      .post(`/boats/${boat.id}/engines/${engine.id}/spare-parts/cart`)
      .loginAs(user)
      .form({ partKey: 'unreferenced.fuel_hose' })
      .redirects(0)

    const items = await itemsFor(engine.id)
    assert.lengthOf(items, 1)
    assert.equal(items[0].partKey, 'unreferenced.fuel_hose')
  })

  test('PATCH cart item updates quantity and noted reference', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)
    const item = await BoatEngineRepairCartItem.create({
      boatEngineId: engine.id,
      partKey: 'lower-unit.impeller',
      quantity: 1,
    })

    await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/spare-parts/cart/${item.id}`)
      .loginAs(user)
      .form({ quantity: 3, reference: '6E0-44352-00' })
      .redirects(0)

    await item.refresh()
    assert.equal(item.quantity, 3)
    assert.equal(item.reference, '6E0-44352-00')
  })

  test('PATCH a cart item of another engine flashes not-found', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)
    const otherEngine = await makeEligibleEngine(boat.id)
    const item = await BoatEngineRepairCartItem.create({
      boatEngineId: otherEngine.id,
      partKey: 'lower-unit.impeller',
      quantity: 1,
    })

    const response = await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/spare-parts/cart/${item.id}`)
      .loginAs(user)
      .form({ quantity: 5 })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Repair list item not found.')
    await item.refresh()
    assert.equal(item.quantity, 1)
  })

  test('DELETE cart item removes it', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)
    const item = await BoatEngineRepairCartItem.create({
      boatEngineId: engine.id,
      partKey: 'propeller.propeller',
      quantity: 1,
    })

    await client
      .delete(`/boats/${boat.id}/engines/${engine.id}/spare-parts/cart/${item.id}`)
      .loginAs(user)
      .redirects(0)

    assert.lengthOf(await itemsFor(engine.id), 0)
  })

  test('a mechanic can add to the cart (maintenance.edit)', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)

    await client
      .post(`/boats/${boat.id}/engines/${engine.id}/spare-parts/cart`)
      .loginAs(mechanic)
      .form({ partKey: 'ignition.stop_switch' })
      .redirects(0)

    assert.lengthOf(await itemsFor(engine.id), 1)
  })

  test('GET export downloads a CSV with catalog names and noted references', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)
    await BoatEngineRepairCartItem.create({
      boatEngineId: engine.id,
      partKey: 'carburetor.float_chamber_gasket',
      quantity: 2,
      reference: '6E0-14384-00',
    })
    await BoatEngineRepairCartItem.create({
      boatEngineId: engine.id,
      partKey: 'unreferenced.shear_pin',
      quantity: 1,
    })

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts/cart/export`)
      .loginAs(user)

    response.assertStatus(200)
    response.assertHeader('content-type', 'text/csv; charset=utf-8')
    const body = response.text()
    assert.include(body, 'GASKET, FLOAT CHAMBER')
    assert.include(body, '6E0-14384-00')
    assert.include(body, '"2"')
    assert.include(body, 'Shear pin')
  })

  test('a read-only boat owner cannot mutate the cart', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    await boat.related('owners').attach([owner.id])
    const engine = await makeEligibleEngine(boat.id)

    const response = await client
      .post(`/boats/${boat.id}/engines/${engine.id}/spare-parts/cart`)
      .loginAs(owner)
      .form({ partKey: 'carburetor.repair_kit' })
      .redirects(0)

    assert.notEqual(response.status(), 200)
    assert.lengthOf(await itemsFor(engine.id), 0)
  })
})
