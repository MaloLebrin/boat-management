import { test } from '@japa/runner'
import Organization from '#models/organization'
import User from '#models/user'
import Boat from '#models/boat'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import BoatListService from '#services/boat_list_service'
import BoatMaintenanceBadgeService from '#services/boat_maintenance_badge_service'
import { DateTime } from 'luxon'

test.group('BoatListService (unit)', (group) => {
  group.each.teardown(async () => {
    await BoatMaintenanceTask.query().delete()
    await Boat.query().delete()
    await User.query().delete()
    await Organization.query().delete()
  })

  test('supports search, filters, sort, and pagination', async ({ assert }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-list-1' })
    const user = await User.create({
      email: 'list1@example.com',
      password: 'Password123!',
      fullName: 'List1',
      organizationId: org.id,
    })

    const a = await Boat.create({
      organizationId: org.id,
      name: 'Alpha',
      registrationNumber: 'REG-001',
      type: 'Sailboat',
      propulsionType: 'sailboat',
    })
    await Boat.create({
      organizationId: org.id,
      name: 'Bravo',
      registrationNumber: 'REG-002',
      type: 'Motor',
      propulsionType: 'motorboat',
    })
    await Boat.create({
      organizationId: org.id,
      name: 'Charlie',
      registrationNumber: null,
      type: 'Sailboat',
      propulsionType: 'sailboat',
    })

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
