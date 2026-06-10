import { test } from '@japa/runner'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import BoatListService from '#services/boat_list_service'
import BoatMaintenanceBadgeService from '#services/boat_maintenance_badge_service'
import { DateTime } from 'luxon'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'

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
})
