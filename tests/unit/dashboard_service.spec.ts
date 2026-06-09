import { test } from '@japa/runner'
import DashboardService from '#services/dashboard_service'
import PortService from '#services/port_service'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import { DateTime } from 'luxon'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'

test.group('DashboardService (unit)', () => {
  test('urgent maintenance includes overdue and due-soon tasks by dueAt', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

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

    const svc = new DashboardService(new PortService())
    const data = await svc.getForUser(user, { urgentWithinDays: 14, urgentLimit: 10 })

    assert.equal(data.urgentMaintenance.length, 2)
    assert.equal(data.urgentMaintenance[0]!.title, 'Overdue')
    assert.equal(data.urgentMaintenance[1]!.title, 'Soon')
    assert.equal(data.urgentMaintenance[0]!.kind, 'date')
  })

  test('urgent maintenance includes engine-hour tasks when within threshold', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 95 }).create()

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

    const svc = new DashboardService(new PortService())
    const data = await svc.getForUser(user, { urgentWithinEngineHours: 10, urgentLimit: 10 })

    assert.equal(data.urgentMaintenance.length, 1)
    assert.equal(data.urgentMaintenance[0]!.kind, 'hours')
    assert.equal(data.urgentMaintenance[0]!.dueEngineHours, 100)
    assert.equal(data.urgentMaintenance[0]!.currentEngineHours, 95)
  })
})
