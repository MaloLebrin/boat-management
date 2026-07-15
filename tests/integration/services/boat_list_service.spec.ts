import { test } from '@japa/runner'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import BoatListService from '#services/boat_list_service'
import BoatMaintenanceBadgeService from '#services/boat_maintenance_badge_service'
import { DateTime } from 'luxon'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatSailFactory } from '#database/factories/boat_sail_factory'
import { BoatRigFactory } from '#database/factories/boat_rig_factory'

test.group('BoatListService (unit)', () => {
  test('supports search, filters, sort, and pagination', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()

    const a = await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Alpha',
      registrationNumber: 'REG-001',
      type: 'Sailboat',
      propulsionType: 'sailboat',
    }).create()
    await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Bravo',
      registrationNumber: 'REG-002',
      type: 'Motor',
      propulsionType: 'motorboat',
    }).create()
    await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Charlie',
      registrationNumber: null,
      type: 'Sailboat',
      propulsionType: 'sailboat',
    }).create()

    // One urgent task on Alpha (overdue)
    await BoatMaintenanceTask.create({
      boatId: a.id,
      subject: 'boat',
      status: 'open',
      title: 'Overdue',
      notes: null,
      boatEngineId: null,
      boatSailId: null,
      boatRigId: null,
      dueAt: DateTime.now().startOf('day').minus({ days: 1 }),
      dueEngineHours: null,
      recurrenceIntervalEngineHours: null,
      recurrenceIntervalMonths: null,
      doneAt: null,
      doneEngineHours: null,
      lastDoneEngineHours: null,
    })

    const svc = new BoatListService(new BoatMaintenanceBadgeService())
    const res = await svc.listForUser(user, {
      q: 'REG-001',
      type: 'Sailboat',
      propulsionType: 'sailboat',
      sort: 'name',
      direction: 'asc',
      page: '1',
      perPage: '1',
    })

    assert.equal(res.boats.data.length, 1)
    assert.equal(res.boats.data[0]!.name, 'Alpha')
    assert.equal(res.boats.meta.perPage, 5)
    assert.equal(res.filters.sort, 'name')
    assert.equal(res.boats.data[0]!.maintenance.urgentCount, 1)
  })

  test('filters boats by equipment presence (hasEngine / hasSails / hasRig)', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const orgId = user.organizationId!

    const withEngine = await BoatFactory.merge({
      organizationId: orgId,
      name: 'Motorized',
    }).create()
    await BoatEngineFactory.merge({ boatId: withEngine.id }).create()

    const withSails = await BoatFactory.merge({ organizationId: orgId, name: 'Sailed' }).create()
    await BoatSailFactory.merge({ boatId: withSails.id }).create()

    const withRig = await BoatFactory.merge({ organizationId: orgId, name: 'Rigged' }).create()
    await BoatRigFactory.merge({ boatId: withRig.id }).create()

    // Bateau nu, sans aucun équipement : ne doit remonter dans aucun filtre.
    await BoatFactory.merge({ organizationId: orgId, name: 'Bare' }).create()

    const svc = new BoatListService(new BoatMaintenanceBadgeService())

    const engines = await svc.listForUser(user, { hasEngine: 'true' })
    assert.deepEqual(
      engines.boats.data.map((b) => b.name),
      ['Motorized']
    )

    const sails = await svc.listForUser(user, { hasSails: 'true' })
    assert.deepEqual(
      sails.boats.data.map((b) => b.name),
      ['Sailed']
    )

    const rig = await svc.listForUser(user, { hasRig: 'true' })
    assert.deepEqual(
      rig.boats.data.map((b) => b.name),
      ['Rigged']
    )

    // Sans filtre : les 4 bateaux sont présents.
    const all = await svc.listForUser(user, {})
    assert.equal(all.boats.data.length, 4)
    assert.isFalse(all.filters.hasEngine)
    assert.isFalse(all.filters.hasSails)
    assert.isFalse(all.filters.hasRig)
  })
})
