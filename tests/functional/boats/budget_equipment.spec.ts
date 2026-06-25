import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser } from '#tests/functional/helpers'
import BoatGenericEquipment from '#models/boat_generic_equipment'
import BoatSafetyEquipment from '#models/boat_safety_equipment'
import BoatSail from '#models/boat_sail'
import BoatEnginePart from '#models/boat_engine_part'
import BoatEngine from '#models/boat_engine'

test.group('Budget Equipment (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /boats/:id/budget includes equipment purchases in totals', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await BoatGenericEquipment.create({
      boatId: boat.id,
      category: 'navigation',
      name: 'GPS',
      status: 'ok',
      purchasePrice: '500.00',
      purchasedAt: DateTime.fromISO('2024-03-15'),
    })

    await BoatSafetyEquipment.create({
      boatId: boat.id,
      equipmentType: 'life_jacket',
      status: 'ok',
      purchasePrice: '150.00',
      purchasedAt: DateTime.fromISO('2024-03-20'),
    })

    await BoatSail.create({
      boatId: boat.id,
      sailType: 'main',
      status: 'operational',
      purchasePrice: '2000.00',
      purchasedAt: DateTime.fromISO('2024-06-10'),
    })

    const engine = await BoatEngine.create({
      boatId: boat.id,
      kind: 'inboard',
      status: 'operational',
    })

    await BoatEnginePart.create({
      boatEngineId: engine.id,
      designation: 'Oil Filter',
      purchasePrice: '35.00',
      purchasedAt: DateTime.fromISO('2024-06-15'),
    })

    const response = await client
      .get(`/boats/${boat.id}/budget`)
      .qs({ year: 2024 })
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps
    const budget = props.budget as {
      totals: { equipment: number; total: number }
      monthly: Array<{ month: number; equipment: number }>
    }

    assert.equal(budget.totals.equipment, 2685)

    const march = budget.monthly.find((m) => m.month === 3)
    assert.equal(march?.equipment, 650)

    const june = budget.monthly.find((m) => m.month === 6)
    assert.equal(june?.equipment, 2035)
  })

  test('GET /boats/:id/budget returns 0 equipment when no purchase data', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await BoatGenericEquipment.create({
      boatId: boat.id,
      category: 'navigation',
      name: 'Compass',
      status: 'ok',
    })

    const response = await client
      .get(`/boats/${boat.id}/budget`)
      .qs({ year: 2024 })
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps
    const budget = props.budget as { totals: { equipment: number } }

    assert.equal(budget.totals.equipment, 0)
  })

  test('GET /boats/:id/budget only includes equipment from specified year', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await BoatGenericEquipment.create({
      boatId: boat.id,
      category: 'electrical',
      name: 'Solar Panel',
      status: 'ok',
      purchasePrice: '800.00',
      purchasedAt: DateTime.fromISO('2023-07-10'),
    })

    await BoatGenericEquipment.create({
      boatId: boat.id,
      category: 'deck',
      name: 'Winch',
      status: 'ok',
      purchasePrice: '400.00',
      purchasedAt: DateTime.fromISO('2024-07-10'),
    })

    const response = await client
      .get(`/boats/${boat.id}/budget`)
      .qs({ year: 2024 })
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps
    const budget = props.budget as { totals: { equipment: number } }

    assert.equal(budget.totals.equipment, 400)
  })

  test('equipment category appears in CSV export', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await BoatGenericEquipment.create({
      boatId: boat.id,
      category: 'anchoring',
      name: 'Anchor',
      status: 'ok',
      purchasePrice: '300.00',
      purchasedAt: DateTime.fromISO('2024-04-01'),
    })

    const response = await client
      .get(`/boats/${boat.id}/export/budget.csv`)
      .qs({ year: 2024 })
      .loginAs(user)

    response.assertStatus(200)
    response.assertHeader('content-type', 'text/csv; charset=utf-8')

    const body = response.text()
    assert.include(body, 'equipment')
    assert.include(body, '300.00')
  })
})
