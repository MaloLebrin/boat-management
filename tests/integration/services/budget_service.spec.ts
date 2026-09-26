import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import BudgetService from '#services/budget_service'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatFuelLogFactory } from '#database/factories/boat_fuel_log_factory'
import { BoatBudgetEntryFactory } from '#database/factories/boat_budget_entry_factory'

test.group('BudgetService — périmètre multi-bateaux (#832)', () => {
  test('getForBoat equals getForBoats([boat]) and two boats are summed', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const orgId = user.organizationId!
    const [a, b] = await BoatFactory.merge({ organizationId: orgId }).createMany(2)
    const year = DateTime.now().year

    await BoatFuelLogFactory.merge({
      boatId: a!.id,
      organizationId: orgId,
      fueledAt: DateTime.fromObject({ year, month: 2, day: 10 }),
      totalCost: '100.00',
    }).create()
    await BoatFuelLogFactory.merge({
      boatId: b!.id,
      organizationId: orgId,
      fueledAt: DateTime.fromObject({ year, month: 3, day: 10 }),
      totalCost: '50.00',
    }).create()

    const svc = new BudgetService()
    const single = await svc.getForBoat(a!, year)
    const viaList = await svc.getForBoats([a!.id], year)
    assert.deepEqual(single, viaList)
    assert.equal(single.totals.fuel, 100)

    const both = await svc.getForBoats([a!.id, b!.id], year)
    assert.equal(both.totals.fuel, 150)
    assert.equal(both.monthly[1]!.fuel, 100)
    assert.equal(both.monthly[2]!.fuel, 50)
  })

  test('the organization summary compares year-to-date with the same months of last year', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const orgId = user.organizationId!
    const boat = await BoatFactory.merge({ organizationId: orgId }).create()
    // Un « maintenant » au 15 mars : la période couvre janvier→mars des deux années
    const now = DateTime.fromObject({ year: 2026, month: 3, day: 15 })

    const entry = (year: number, month: number, amount: string) =>
      BoatBudgetEntryFactory.merge({
        boatId: boat.id,
        date: DateTime.fromObject({ year, month, day: 5 }),
        amount,
      }).create()
    await entry(2026, 1, '200')
    await entry(2026, 3, '100')
    await entry(2026, 6, '999') // après « maintenant » : ignorée
    await entry(2025, 2, '150')
    await entry(2025, 9, '888') // hors période comparée : ignorée

    const summary = await new BudgetService().getOrgSpendSummary([boat.id], now)

    assert.equal(summary.year, 2026)
    assert.equal(summary.throughMonth, 3)
    assert.equal(summary.totals.entries, 300)
    assert.equal(summary.totals.total, 300)
    assert.equal(summary.previousYearToDate?.total, 150)
    assert.equal(summary.singleBoatId, boat.id)
  })

  test('returns zeros without boats and no comparison without last-year spend', async ({
    assert,
  }) => {
    const svc = new BudgetService()
    const empty = await svc.getOrgSpendSummary([], DateTime.now())
    assert.equal(empty.totals.total, 0)
    assert.isNull(empty.previousYearToDate)
    assert.isNull(empty.singleBoatId)

    const user = await UserFactory.with('organization').create()
    const boats = await BoatFactory.merge({ organizationId: user.organizationId! }).createMany(2)
    const two = await svc.getOrgSpendSummary(
      boats.map((b) => b.id),
      DateTime.now()
    )
    assert.isNull(two.singleBoatId)
    assert.isNull(two.previousYearToDate)
  })
})
