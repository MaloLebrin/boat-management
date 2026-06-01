import { test } from '@japa/runner'
import BoatEnginePartService from '#services/boat_engine_part_service'
import BoatEnginePart from '#models/boat_engine_part'
import BoatEngine from '#models/boat_engine'
import Organization from '#models/organization'
import User from '#models/user'
import Boat from '#models/boat'

test.group('BoatEnginePartService (unit)', (group) => {
  group.each.teardown(async () => {
    await BoatEnginePart.query().delete()
    await BoatEngine.query().delete()
    await Boat.query().delete()
    await User.query().delete()
    await Organization.query().delete()
  })

  async function setup(slug: string) {
    const org = await Organization.create({ name: 'O', slug })
    const user = await User.create({
      email: `${slug}@example.com`,
      password: 'Password123!',
      fullName: 'Test',
      organizationId: org.id,
    })
    const boat = await Boat.create({ organizationId: org.id, name: 'B', registrationNumber: null, type: null })
    boat.$extras = {}
    await boat.load('engines')
    const engine = await BoatEngine.create({ boatId: boat.id, kind: 'inboard', fuel: 'diesel', brand: 'Yanmar', model: '3YM', serialNumber: null, powerHp: 30, hours: 100 })
    await boat.load('engines')
    return { org, user, boat, engine }
  }

  test('create stores part with minStockAlert', async ({ assert }) => {
    const { user, boat, engine } = await setup('ep-svc-1')
    const svc = new BoatEnginePartService()

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
    const { user, boat, engine } = await setup('ep-svc-2')
    const svc = new BoatEnginePartService()

    await svc.create(user, boat, engine.id, { designation: 'Impeller', stock: 1, minStockAlert: 2 })
    await svc.create(user, boat, engine.id, { designation: 'Belt', stock: 5, minStockAlert: 2 })
    await svc.create(user, boat, engine.id, { designation: 'Fuel filter', stock: 0, minStockAlert: 1 })
    await svc.create(user, boat, engine.id, { designation: 'Spark plug', stock: 10 })

    const lowStock = await svc.listLowStock(engine.id)

    assert.equal(lowStock.length, 2)
    const names = lowStock.map((p) => p.designation).sort()
    assert.deepEqual(names, ['Fuel filter', 'Impeller'])
  })

  test('listLowStock ignores parts without minStockAlert', async ({ assert }) => {
    const { user, boat, engine } = await setup('ep-svc-3')
    const svc = new BoatEnginePartService()

    await svc.create(user, boat, engine.id, { designation: 'Oil', stock: 0 })

    const lowStock = await svc.listLowStock(engine.id)
    assert.equal(lowStock.length, 0)
  })

  test('update persists minStockAlert changes', async ({ assert }) => {
    const { user, boat, engine } = await setup('ep-svc-4')
    const svc = new BoatEnginePartService()

    const part = await svc.create(user, boat, engine.id, { designation: 'Gasket', stock: 3, minStockAlert: 1 })
    await svc.update(user, boat, engine.id, part.id, { designation: 'Gasket', stock: 3, minStockAlert: 5 })

    const updated = await BoatEnginePart.findOrFail(part.id)
    assert.equal(updated.minStockAlert, 5)
  })
})
