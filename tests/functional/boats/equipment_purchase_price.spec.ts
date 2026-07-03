import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { createAdminUser } from '#tests/functional/helpers'
import BoatSafetyEquipment from '#models/boat_safety_equipment'
import BoatGenericEquipment from '#models/boat_generic_equipment'
import BoatEnginePart from '#models/boat_engine_part'

test.group('Equipment purchasePrice validation (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST safety-equipment rejects a negative purchasePrice', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/safety-equipment`)
      .form({ equipmentType: 'life_jacket', purchasePrice: '-500' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    const items = await BoatSafetyEquipment.query().where('boat_id', boat.id)
    assert.lengthOf(items, 0)
  })

  test('POST safety-equipment rejects a non-numeric purchasePrice', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/safety-equipment`)
      .form({ equipmentType: 'life_jacket', purchasePrice: 'abc' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    const items = await BoatSafetyEquipment.query().where('boat_id', boat.id)
    assert.lengthOf(items, 0)
  })

  test('POST safety-equipment accepts a valid purchasePrice', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/safety-equipment`)
      .form({ equipmentType: 'life_jacket', purchasePrice: '129.99' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    const items = await BoatSafetyEquipment.query().where('boat_id', boat.id)
    assert.lengthOf(items, 1)
    assert.equal(Number.parseFloat(items[0].purchasePrice!), 129.99)
  })

  test('POST generic-equipment rejects a negative purchasePrice', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/generic-equipment`)
      .form({ category: 'navigation', name: 'GPS', purchasePrice: '-10' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    const items = await BoatGenericEquipment.query().where('boat_id', boat.id)
    assert.lengthOf(items, 0)
  })

  test('POST generic-equipment rejects a malformed decimal purchasePrice', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/generic-equipment`)
      .form({ category: 'navigation', name: 'GPS', purchasePrice: '3.14.15' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    const items = await BoatGenericEquipment.query().where('boat_id', boat.id)
    assert.lengthOf(items, 0)
  })

  test('POST generic-equipment accepts a valid purchasePrice', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/generic-equipment`)
      .form({ category: 'navigation', name: 'GPS', purchasePrice: '250.5' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    const items = await BoatGenericEquipment.query().where('boat_id', boat.id)
    assert.lengthOf(items, 1)
    assert.equal(Number.parseFloat(items[0].purchasePrice!), 250.5)
  })

  test('POST engine part rejects a negative purchasePrice', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    boat.$extras = {}
    await boat.load('engines')
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()

    const response = await client
      .post(`/boats/${boat.id}/engines/${engine.id}/parts`)
      .form({ designation: 'Oil Filter', purchasePrice: '-35' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    const parts = await BoatEnginePart.query().where('boat_engine_id', engine.id)
    assert.lengthOf(parts, 0)
  })

  test('POST engine part rejects a non-numeric purchasePrice', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    boat.$extras = {}
    await boat.load('engines')
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()

    const response = await client
      .post(`/boats/${boat.id}/engines/${engine.id}/parts`)
      .form({ designation: 'Oil Filter', purchasePrice: 'free' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    const parts = await BoatEnginePart.query().where('boat_engine_id', engine.id)
    assert.lengthOf(parts, 0)
  })

  test('POST engine part accepts a valid purchasePrice', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    boat.$extras = {}
    await boat.load('engines')
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()

    const response = await client
      .post(`/boats/${boat.id}/engines/${engine.id}/parts`)
      .form({ designation: 'Oil Filter', purchasePrice: '35.00' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    const parts = await BoatEnginePart.query().where('boat_engine_id', engine.id)
    assert.lengthOf(parts, 1)
    assert.equal(Number.parseFloat(parts[0].purchasePrice!), 35)
  })
})
