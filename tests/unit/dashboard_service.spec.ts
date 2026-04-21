import { test } from '@japa/runner'
import DashboardService from '#services/dashboard_service'
import BoatEngine from '#models/boat_engine'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import Organization from '#models/organization'
import User from '#models/user'
import Boat from '#models/boat'
import { DateTime } from 'luxon'

test.group('DashboardService (unit)', (group) => {
  group.each.teardown(async () => {
    await BoatMaintenanceTask.query().delete()
    await BoatEngine.query().delete()
    await Boat.query().delete()
    await User.query().delete()
    await Organization.query().delete()
  })

  test('urgent maintenance includes overdue and due-soon tasks by dueAt', async ({ assert }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-dash-1' })
    const user = await User.create({
      email: 'dash@example.com',
      password: 'Password123!',
      fullName: 'Dash',
      organizationId: org.id,
    })
    const boat = await Boat.create({
      organizationId: org.id,
      name: 'B',
      registrationNumber: null,
      type: null,
    })

    const today = DateTime.now().startOf('day')

    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'boat',
      status: 'open',
      dueAt: today.minus({ days: 1 }),
      title: 'Overdue',
      notes: null,
      boatEngineId: null,
      boatSailId: null,
      boatRigId: null,
      doneAt: null,
      doneEngineHours: null,
      lastDoneEngineHours: null,
      dueEngineHours: null,
      recurrenceIntervalMonths: null,
      recurrenceIntervalEngineHours: null,
    })

    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'boat',
      status: 'open',
      dueAt: today.plus({ days: 3 }),
      title: 'Soon',
      notes: null,
      boatEngineId: null,
      boatSailId: null,
      boatRigId: null,
      doneAt: null,
      doneEngineHours: null,
      lastDoneEngineHours: null,
      dueEngineHours: null,
      recurrenceIntervalMonths: null,
      recurrenceIntervalEngineHours: null,
    })

    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'boat',
      status: 'open',
      dueAt: today.plus({ days: 40 }),
      title: 'Later',
      notes: null,
      boatEngineId: null,
      boatSailId: null,
      boatRigId: null,
      doneAt: null,
      doneEngineHours: null,
      lastDoneEngineHours: null,
      dueEngineHours: null,
      recurrenceIntervalMonths: null,
      recurrenceIntervalEngineHours: null,
    })

    const svc = new DashboardService()
    const data = await svc.getForUser(user, { urgentWithinDays: 14, urgentLimit: 10 })

    assert.equal(data.urgentMaintenance.length, 2)
    assert.equal(data.urgentMaintenance[0]!.title, 'Overdue')
    assert.equal(data.urgentMaintenance[1]!.title, 'Soon')
    assert.equal(data.urgentMaintenance[0]!.kind, 'date')
  })

  test('urgent maintenance includes engine-hour tasks when within threshold', async ({
    assert,
  }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-dash-2' })
    const user = await User.create({
      email: 'dash2@example.com',
      password: 'Password123!',
      fullName: 'Dash2',
      organizationId: org.id,
    })
    const boat = await Boat.create({
      organizationId: org.id,
      name: 'B',
      registrationNumber: null,
      type: null,
    })
    const engine = await BoatEngine.create({
      boatId: boat.id,
      kind: 'inboard',
      fuel: 'diesel',
      brand: null,
      model: null,
      serialNumber: null,
      powerHp: null,
      hours: 95,
    })

    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'engine',
      status: 'open',
      title: 'Oil change @ 100h',
      notes: null,
      boatEngineId: engine.id,
      boatSailId: null,
      boatRigId: null,
      dueAt: null,
      dueEngineHours: 100,
      recurrenceIntervalEngineHours: 50,
      recurrenceIntervalMonths: null,
      doneAt: null,
      doneEngineHours: null,
      lastDoneEngineHours: null,
    })

    const svc = new DashboardService()
    const data = await svc.getForUser(user, { urgentWithinEngineHours: 10, urgentLimit: 10 })

    assert.equal(data.urgentMaintenance.length, 1)
    assert.equal(data.urgentMaintenance[0]!.kind, 'hours')
    assert.equal(data.urgentMaintenance[0]!.dueEngineHours, 100)
    assert.equal(data.urgentMaintenance[0]!.currentEngineHours, 95)
  })
})
