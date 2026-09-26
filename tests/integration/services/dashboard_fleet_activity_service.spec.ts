import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import DashboardFleetActivityService from '#services/dashboard_fleet_activity_service'
import EngineListService from '#services/engine_list_service'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatMaintenanceTaskFactory } from '#database/factories/boat_maintenance_task_factory'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'

function service() {
  return new DashboardFleetActivityService(new EngineListService())
}

test.group('DashboardFleetActivityService (#832)', () => {
  test('lists in-progress trips of the organization only, oldest first, with the exact total', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const orgId = user.organizationId!
    const boats = await BoatFactory.merge({ organizationId: orgId }).createMany(7)
    for (const [i, boat] of boats.entries()) {
      await NavigationLogFactory.merge({
        boatId: boat.id,
        organizationId: orgId,
        departedAt: DateTime.now().minus({ hours: 10 - i }),
        departurePortName: i === 0 ? 'Brest' : null,
        crewCount: i === 0 ? 4 : null,
      }).create()
    }
    // Terminée : hors liste
    await NavigationLogFactory.merge({
      boatId: boats[0]!.id,
      organizationId: orgId,
      status: 'completed',
      arrivedAt: DateTime.now(),
    }).create()
    // Autre organisation
    const other = await UserFactory.with('organization').create()
    const otherBoat = await BoatFactory.merge({ organizationId: other.organizationId! }).create()
    await NavigationLogFactory.merge({
      boatId: otherBoat.id,
      organizationId: other.organizationId!,
    }).create()

    const trips = await service().getActiveTrips(user)

    assert.equal(trips.total, 7)
    assert.equal(trips.items.length, 5)
    assert.equal(trips.items[0]!.boatName, boats[0]!.name)
    assert.equal(trips.items[0]!.departurePortName, 'Brest')
    assert.equal(trips.items[0]!.crewCount, 4)
    assert.isTrue(trips.items[0]!.departedAt < trips.items[1]!.departedAt)
  })

  test('fleet status derives in-port boats from the at-sea count and counts engines in maintenance', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const boats = await BoatFactory.merge({ organizationId: user.organizationId! }).createMany(3)
    await BoatEngineFactory.merge({ boatId: boats[0]!.id, status: 'in_maintenance' }).create()
    await BoatEngineFactory.merge({ boatId: boats[1]!.id }).create()

    const status = await service().getFleetStatus(
      boats.map((b) => b.id),
      1
    )
    assert.deepEqual(status, { total: 3, atSea: 1, inPort: 2, enginesInMaintenance: 1 })

    const empty = await service().getFleetStatus([], 0)
    assert.deepEqual(empty, { total: 0, atSea: 0, inPort: 0, enginesInMaintenance: 0 })
  })

  test('the pulse counts completed trips (with distance) and done tasks inside the 30-day window', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const orgId = user.organizationId!
    const boat = await BoatFactory.merge({ organizationId: orgId }).create()
    const now = DateTime.now()

    const completed = (daysAgo: number, nm: string | null) =>
      NavigationLogFactory.merge({
        boatId: boat.id,
        organizationId: orgId,
        status: 'completed',
        departedAt: now.minus({ days: daysAgo, hours: 4 }),
        arrivedAt: now.minus({ days: daysAgo }),
        distanceNm: nm,
      }).create()
    await completed(1, '12.5')
    await completed(29, '7')
    await completed(29, null)
    await completed(31, '100') // hors fenêtre
    await NavigationLogFactory.merge({ boatId: boat.id, organizationId: orgId }).create() // en cours

    const done = (daysAgo: number) =>
      BoatMaintenanceTaskFactory.merge({
        boatId: boat.id,
        status: 'done',
        doneAt: now.startOf('day').minus({ days: daysAgo }),
      }).create()
    await done(0)
    await done(29)
    await done(31) // hors fenêtre
    await BoatMaintenanceTaskFactory.merge({ boatId: boat.id }).create() // ouverte

    const pulse = await service().getPulse(user, [boat.id], now)

    assert.equal(pulse.windowDays, 30)
    assert.equal(pulse.tripsCompleted, 3)
    assert.equal(pulse.distanceNm, 19.5)
    assert.equal(pulse.tasksDone, 2)
  })

  test('returns zeros without organization or boats', async ({ assert }) => {
    const orphan = await UserFactory.merge({ organizationId: null }).create()
    const svc = service()
    assert.deepEqual(await svc.getActiveTrips(orphan), { items: [], total: 0 })
    const pulse = await svc.getPulse(orphan, [])
    assert.equal(pulse.tripsCompleted, 0)
    assert.equal(pulse.tasksDone, 0)
  })
})
