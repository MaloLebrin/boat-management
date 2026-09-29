import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import FleetReportingService from '#services/fleet_reporting_service'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatFuelLogFactory } from '#database/factories/boat_fuel_log_factory'
import { BoatBudgetEntryFactory } from '#database/factories/boat_budget_entry_factory'
import { BoatPortStayFactory } from '#database/factories/boat_port_stay_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { InvoiceFactory } from '#database/factories/invoice_factory'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'
import type Boat from '#models/boat'

/**
 * Jeu de données de référence du reporting (#887), figé au 15 juin 2026 :
 *
 * - bateau A : plein 100 € et dépense libre 50 € en juin, plein 40 € en mai ;
 *   location confirmée de 1 000 € du 27 mai au 6 juin (10 jours, 5 en juin) ;
 *   sortie de 4 h moteur et 20 milles ; facture payée de 300 € rattachée ;
 * - bateau B : escale 25 € en juin, une location annulée et une option (ignorées) ;
 * - hors bateau : facture payée 120 €, avoir remboursé 50 € ;
 * - autre organisation : plein 999 € et facture payée 999 € (jamais comptés).
 */
const NOW = DateTime.fromISO('2026-06-15T12:00:00Z', { zone: 'utc' })
const at = (iso: string) => DateTime.fromISO(iso, { zone: 'utc' })

async function seedReference() {
  const user = await UserFactory.with('organization', 1, (org) =>
    org.merge({ plan: 'pro' })
  ).create()
  const orgId = user.organizationId!
  const [boatA, boatB] = (await BoatFactory.merge({ organizationId: orgId }).createMany(2)) as [
    Boat,
    Boat,
  ]
  boatA.name = 'Albatros'
  boatB.name = 'Bécassine'
  await boatA.save()
  await boatB.save()

  await BoatFuelLogFactory.merge({
    boatId: boatA.id,
    organizationId: orgId,
    fueledAt: at('2026-06-10T09:00:00'),
    totalCost: '100.00',
  }).create()
  await BoatFuelLogFactory.merge({
    boatId: boatA.id,
    organizationId: orgId,
    fueledAt: at('2026-05-10T09:00:00'),
    totalCost: '40.00',
  }).create()
  await BoatBudgetEntryFactory.merge({
    boatId: boatA.id,
    date: at('2026-06-05'),
    amount: '50.00',
  }).create()
  await BoatPortStayFactory.merge({
    boatId: boatB.id,
    startedAt: at('2026-06-02T10:00:00'),
    endedAt: at('2026-06-03T10:00:00'),
    cost: '25.00',
  }).create()

  const rental = await BoatReservationFactory.merge({
    organizationId: orgId,
    boatId: boatA.id,
    status: 'confirmed',
    startsAt: at('2026-05-27T00:00:00'),
    endsAt: at('2026-06-06T00:00:00'),
    totalPrice: '1000.00',
  }).create()
  await BoatReservationFactory.merge({
    organizationId: orgId,
    boatId: boatB.id,
    status: 'cancelled',
    startsAt: at('2026-06-10T00:00:00'),
    endsAt: at('2026-06-12T00:00:00'),
    totalPrice: '800.00',
  }).create()
  await BoatReservationFactory.merge({
    organizationId: orgId,
    boatId: boatB.id,
    status: 'option',
    startsAt: at('2026-06-20T00:00:00'),
    endsAt: at('2026-06-22T00:00:00'),
    totalPrice: '800.00',
  }).create()

  await NavigationLogFactory.merge({
    organizationId: orgId,
    boatId: boatA.id,
    status: 'completed',
    departedAt: at('2026-06-08T08:00:00'),
    arrivedAt: at('2026-06-08T14:00:00'),
    engineHoursStart: '100.0',
    engineHoursEnd: '104.0',
    distanceNm: '20.0',
  }).create()

  await InvoiceFactory.merge({
    organizationId: orgId,
    reservationId: rental.id,
    total: '300.00',
    status: 'paid',
    paidAt: at('2026-06-12'),
  })
    .apply('invoice')
    .create()
  await InvoiceFactory.merge({
    organizationId: orgId,
    total: '120.00',
    status: 'paid',
    paidAt: at('2026-06-03'),
  })
    .apply('invoice')
    .create()
  await InvoiceFactory.merge({
    organizationId: orgId,
    kind: 'credit_note',
    number: 'AV-000001',
    status: 'paid',
    total: '50.00',
    paidAt: at('2026-06-04'),
  }).create()

  // Autre organisation : rien de tout cela ne doit remonter.
  const other = await UserFactory.with('organization').create()
  const otherBoat = await BoatFactory.merge({ organizationId: other.organizationId! }).create()
  await BoatFuelLogFactory.merge({
    boatId: otherBoat.id,
    organizationId: other.organizationId!,
    fueledAt: at('2026-06-10T09:00:00'),
    totalCost: '999.00',
  }).create()
  await InvoiceFactory.merge({
    organizationId: other.organizationId!,
    total: '999.00',
    status: 'paid',
    paidAt: at('2026-06-10'),
  })
    .apply('invoice')
    .create()

  const boats = [
    { id: boatA.id, name: boatA.name },
    { id: boatB.id, name: boatB.name },
  ]
  return { orgId, boatA, boatB, boats }
}

test.group('FleetReportingService — vue financière de flotte (#887)', () => {
  test('crosses costs, pro-rated rental revenue, occupancy and unit costs for the month', async ({
    assert,
  }) => {
    const { orgId, boatA, boatB, boats } = await seedReference()
    const service = await app.container.make(FleetReportingService)

    const report = await service.getReport(orgId, boats, { preset: 'month' }, NOW)

    assert.deepEqual(report.period, {
      preset: 'month',
      from: '2026-06-01',
      to: '2026-06-30',
      days: 30,
    })
    assert.equal(report.previousPeriod.from, '2026-05-01')
    assert.isNull(report.boatId)

    const { totals } = report
    assert.equal(totals.costs.fuel, 100)
    assert.equal(totals.costs.entries, 50)
    assert.equal(totals.costs.port, 25)
    assert.equal(totals.costs.total, 175)
    // 10 jours à 1 000 €, dont 5 en juin : la moitié du prix.
    assert.equal(totals.rentalRevenue, 500)
    assert.equal(totals.rentalDays, 5)
    assert.equal(totals.margin, 325)
    // 5 jours-bateau / (2 bateaux × 30 jours) = 8,3 %.
    assert.equal(totals.occupancyRate, 8)
    // 300 + 120 − 50 : l'avoir remboursé se retranche, l'autre organisation est ignorée.
    assert.equal(totals.invoicedPaid, 370)
    assert.equal(totals.engineHours, 4)
    assert.equal(totals.distanceNm, 20)

    // Tri par coût décroissant : A (150 €) avant B (25 €).
    assert.deepEqual(
      report.boats.map((row) => row.boatId),
      [boatA.id, boatB.id]
    )
    const [rowA, rowB] = report.boats
    assert.equal(rowA!.costs.total, 150)
    assert.equal(rowA!.occupancyRate, 17)
    assert.equal(rowA!.invoicedPaid, 300)
    assert.equal(rowA!.costPerEngineHour, 37.5)
    assert.equal(rowA!.costPerNauticalMile, 7.5)
    assert.equal(rowA!.costPerRentalDay, 30)
    // B : ni location confirmée ni sortie — pas de ratio inventé.
    assert.equal(rowB!.rentalRevenue, 0)
    assert.isNull(rowB!.costPerRentalDay)
    assert.isNull(rowB!.costPerEngineHour)

    assert.deepEqual(
      report.monthly.map((m) => m.month),
      ['2026-06']
    )
    assert.equal(report.monthly[0]!.costs.total, 175)
    assert.equal(report.monthly[0]!.rentalRevenue, 500)
  })

  test('compares with the previous period, which holds the other half of the rental', async ({
    assert,
  }) => {
    const { orgId, boats } = await seedReference()
    const service = await app.container.make(FleetReportingService)

    const report = await service.getReport(orgId, boats, { preset: 'month' }, NOW)

    assert.equal(report.previousTotals.costs.total, 40)
    assert.equal(report.previousTotals.rentalRevenue, 500)
    assert.equal(report.previousTotals.margin, 460)
  })

  test('splits a period spanning two months and keeps both halves of the rental', async ({
    assert,
  }) => {
    const { orgId, boats } = await seedReference()
    const service = await app.container.make(FleetReportingService)

    const report = await service.getReport(
      orgId,
      boats,
      { preset: 'custom', from: '2026-05-01', to: '2026-06-30' },
      NOW
    )

    assert.equal(report.period.days, 61)
    assert.equal(report.totals.rentalRevenue, 1000)
    assert.equal(report.totals.costs.total, 215)
    const [may, june] = report.monthly
    assert.equal(may!.month, '2026-05')
    assert.equal(may!.rentalRevenue, 500)
    assert.equal(may!.costs.fuel, 40)
    assert.equal(june!.rentalRevenue, 500)
  })

  test('a boat filter restricts every figure and leaves unattributed invoices out', async ({
    assert,
  }) => {
    const { orgId, boatB, boats } = await seedReference()
    const service = await app.container.make(FleetReportingService)

    const report = await service.getReport(orgId, boats, { preset: 'month', boatId: boatB.id }, NOW)

    assert.equal(report.boatId, boatB.id)
    assert.lengthOf(report.boats, 1)
    assert.equal(report.totals.costs.total, 25)
    assert.equal(report.totals.invoicedPaid, 0)
    assert.equal(report.totals.rentalRevenue, 0)
  })

  test('an unknown boat id falls back to the whole fleet', async ({ assert }) => {
    const { orgId, boats } = await seedReference()
    const service = await app.container.make(FleetReportingService)

    const report = await service.getReport(orgId, boats, { preset: 'month', boatId: 999_999 }, NOW)

    assert.isNull(report.boatId)
    assert.lengthOf(report.boats, 2)
    assert.equal(report.totals.costs.total, 175)
  })

  test('an organization without boats gets an empty report, never null', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const service = await app.container.make(FleetReportingService)

    const report = await service.getReport(user.organizationId!, [], { preset: 'year' }, NOW)

    assert.equal(report.period.from, '2026-01-01')
    assert.lengthOf(report.monthly, 12)
    assert.equal(report.totals.costs.total, 0)
    assert.equal(report.totals.occupancyRate, 0)
    assert.isNull(report.totals.costPerRentalDay)
  })

  test('the dashboard margin widget reads the same month', async ({ assert }) => {
    const { orgId, boatA } = await seedReference()
    const user = await UserFactory.merge({ organizationId: orgId }).create()
    const service = await app.container.make(FleetReportingService)

    const margin = await service.getMonthMarginForUser(user, NOW)

    assert.equal(margin.rentalRevenue, 500)
    assert.equal(margin.costs, 175)
    assert.equal(margin.margin, 325)
    assert.equal(margin.previousMargin, 460)
    assert.deepEqual(margin.topCostBoat, { id: boatA.id, name: 'Albatros', costs: 150 })
  })
})
