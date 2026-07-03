import { test } from '@japa/runner'
import BoatEnginePartService from '#services/boat_engine_part_service'
import BoatEnginePart from '#models/boat_engine_part'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import app from '@adonisjs/core/services/app'

test.group('BoatEnginePartService (unit)', () => {
  test('create stores part with minStockAlert', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    boat.$extras = {}
    await boat.load('engines')
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    await boat.load('engines')

    const svc = await app.container.make(BoatEnginePartService)

    const part = await svc.create(user, boat, engine.id, {
      designation: 'Oil filter',
      stock: 5,
      minStockAlert: 2,
      wearState: 'good',
    })

    assert.equal(part.designation, 'Oil filter')
    assert.equal(part.stock, 5)
    assert.equal(part.minStockAlert, 2)
  })

  test('listLowStock returns parts at or below threshold', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    boat.$extras = {}
    await boat.load('engines')
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    await boat.load('engines')

    const svc = await app.container.make(BoatEnginePartService)

    await svc.create(user, boat, engine.id, { designation: 'Impeller', stock: 1, minStockAlert: 2 })
    await svc.create(user, boat, engine.id, { designation: 'Belt', stock: 5, minStockAlert: 2 })
    await svc.create(user, boat, engine.id, {
      designation: 'Fuel filter',
      stock: 0,
      minStockAlert: 1,
    })
    await svc.create(user, boat, engine.id, { designation: 'Spark plug', stock: 10 })

    const lowStock = await svc.listLowStock(engine.id)

    assert.equal(lowStock.length, 2)
    const names = lowStock.map((p) => p.designation).sort()
    assert.deepEqual(names, ['Fuel filter', 'Impeller'])
  })

  test('listLowStock ignores parts with untracked (null) stock', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    boat.$extras = {}
    await boat.load('engines')
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    await boat.load('engines')

    const svc = await app.container.make(BoatEnginePartService)

    await svc.create(user, boat, engine.id, {
      designation: 'Untracked gasket',
      stock: null,
      minStockAlert: 2,
    })

    const lowStock = await svc.listLowStock(engine.id)
    assert.equal(lowStock.length, 0)
  })

  test('listLowStock ignores parts without minStockAlert', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    boat.$extras = {}
    await boat.load('engines')
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    await boat.load('engines')

    const svc = await app.container.make(BoatEnginePartService)

    await svc.create(user, boat, engine.id, { designation: 'Oil', stock: 0 })

    const lowStock = await svc.listLowStock(engine.id)
    assert.equal(lowStock.length, 0)
  })

  test('update persists minStockAlert changes', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    boat.$extras = {}
    await boat.load('engines')
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    await boat.load('engines')

    const svc = await app.container.make(BoatEnginePartService)

    const part = await svc.create(user, boat, engine.id, {
      designation: 'Gasket',
      stock: 3,
      minStockAlert: 1,
    })
    await svc.update(user, boat, engine.id, part.id, {
      designation: 'Gasket',
      stock: 3,
      minStockAlert: 5,
    })

    const updated = await BoatEnginePart.findOrFail(part.id)
    assert.equal(updated.minStockAlert, 5)
  })
})
