import { test } from '@japa/runner'
import BoatMaintenanceTaskService, {
  BoatMaintenanceTaskNotFoundError,
  BoatMaintenanceTaskValidationError,
} from '#services/boat_maintenance_task_service'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import { DateTime } from 'luxon'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'

test.group('BoatMaintenanceTaskService (unit)', () => {
  test('createForBoat requires dueAt or dueEngineHours', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const svc = new BoatMaintenanceTaskService()
    await assert.rejects(
      () =>
        svc.createForBoat(user, boat, {
          subject: 'boat',
          title: 'No due',
        }),
      BoatMaintenanceTaskValidationError
    )
  })

  test('markDone creates next task by months recurrence', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const svc = new BoatMaintenanceTaskService()
    const task = await svc.createForBoat(user, boat, {
      subject: 'boat',
      title: 'Antifouling',
      dueAt: '2026-01-01',
      recurrenceIntervalMonths: 12,
    })

    const doneAt = DateTime.fromISO('2026-02-10')
    await svc.markDone(user, boat, task.id, { doneAt })

    const tasks = await BoatMaintenanceTask.query().where('boatId', boat.id).orderBy('id', 'asc')
    assert.equal(tasks.length, 2)
    assert.equal(tasks[0]!.status, 'done')
    assert.equal(tasks[1]!.status, 'open')
    assert.equal(tasks[1]!.dueAt?.toISODate(), doneAt.plus({ months: 12 }).toISODate())
  })

  test('markDone creates next task by engine-hours recurrence', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 100 }).create()

    const svc = new BoatMaintenanceTaskService()
    const task = await svc.createForBoat(user, boat, {
      subject: 'engine',
      boatEngineId: engine.id,
      title: 'Oil change',
      dueEngineHours: 150,
      recurrenceIntervalEngineHours: 50,
    })

    await svc.markDone(user, boat, task.id, { doneAt: '2026-03-01', doneEngineHours: 155 })

    const tasks = await BoatMaintenanceTask.query().where('boatId', boat.id).orderBy('id', 'asc')
    assert.equal(tasks.length, 2)
    assert.equal(tasks[0]!.status, 'done')
    assert.equal(tasks[0]!.doneEngineHours, 155)
    assert.equal(tasks[1]!.status, 'open')
    assert.equal(tasks[1]!.dueEngineHours, 205)
    assert.equal(tasks[1]!.lastDoneEngineHours, 155)
  })

  test('cross-boat scope hides tasks', async ({ assert }) => {
    const userA = await UserFactory.with('organization').create()
    const userB = await UserFactory.with('organization').create()
    const boatA = await BoatFactory.merge({ organizationId: userA.organizationId! }).create()
    const boatB = await BoatFactory.merge({ organizationId: userB.organizationId! }).create()

    const svc = new BoatMaintenanceTaskService()
    const taskA = await svc.createForBoat(userA, boatA, {
      subject: 'boat',
      title: 'A',
      dueAt: '2026-01-01',
    })

    await assert.rejects(
      () => svc.markDone(userB, boatB, taskA.id, { doneAt: '2026-01-02' }),
      BoatMaintenanceTaskNotFoundError
    )
  })
})
