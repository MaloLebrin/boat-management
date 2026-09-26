import { test } from '@japa/runner'
import BoatEnginePartService from '#services/boat_engine_part_service'
import BoatEnginePart from '#models/boat_engine_part'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatEnginePartFactory } from '#database/factories/boat_engine_part_factory'
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

test.group('BoatEnginePartService.listAlertsForBoats (widget « Pièces manquantes »)', () => {
  test('lists fleet-wide parts under threshold or to replace, shortages first, with exact counts', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      brand: 'Yanmar',
      model: '3YM30',
    }).create()
    const part = (over: Record<string, unknown>) =>
      BoatEnginePartFactory.merge({ boatEngineId: engine.id, ...over }).create()

    await part({ designation: 'Impeller', stock: 1, minStockAlert: 2, wearState: 'to_replace' })
    await part({ designation: 'Belt', stock: 5, minStockAlert: 2, wearState: 'good' })
    await part({ designation: 'Fuel filter', stock: 0, minStockAlert: 1, wearState: 'good' })
    await part({
      designation: 'Spark plug',
      stock: 10,
      minStockAlert: null,
      wearState: 'to_replace',
    })
    await part({ designation: 'Gasket', stock: 3, minStockAlert: null, wearState: 'damaged' })
    // Sans seuil ni usure critique : jamais en alerte, même à stock nul.
    await part({ designation: 'Anode', stock: 0, minStockAlert: null, wearState: 'worn' })
    // Autre bateau, hors flotte demandée.
    const otherBoat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const otherEngine = await BoatEngineFactory.merge({ boatId: otherBoat.id }).create()
    await BoatEnginePartFactory.merge({
      boatEngineId: otherEngine.id,
      designation: 'Elsewhere',
      stock: 0,
      minStockAlert: 1,
    }).create()

    const svc = await app.container.make(BoatEnginePartService)
    const alerts = await svc.listAlertsForBoats([boat.id])

    assert.equal(alerts.total, 4)
    assert.equal(alerts.lowStockCount, 2)
    // « Impeller » compte dans les deux : sous le seuil **et** à remplacer.
    assert.equal(alerts.toReplaceCount, 3)
    assert.deepEqual(
      alerts.items.map((item) => [item.designation, item.reason]),
      [
        ['Fuel filter', 'low_stock'],
        ['Impeller', 'low_stock'],
        ['Gasket', 'to_replace'],
        ['Spark plug', 'to_replace'],
      ]
    )
    const first = alerts.items[0]!
    assert.equal(first.boatId, boat.id)
    assert.equal(first.boatName, boat.name)
    assert.equal(first.engineId, engine.id)
    assert.equal(first.engineBrand, 'Yanmar')
    assert.equal(first.engineModel, '3YM30')
    assert.equal(first.stock, 0)
    assert.equal(first.minStockAlert, 1)

    const capped = await svc.listAlertsForBoats([boat.id], 3)
    assert.lengthOf(capped.items, 3)
    assert.equal(capped.total, 4)

    assert.deepEqual(await svc.listAlertsForBoats([]), {
      items: [],
      total: 0,
      lowStockCount: 0,
      toReplaceCount: 0,
    })
  })
})
