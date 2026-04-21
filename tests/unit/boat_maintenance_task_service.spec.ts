import { test } from '@japa/runner'
import BoatMaintenanceTaskService, {
  BoatMaintenanceTaskNotFoundError,
  BoatMaintenanceTaskValidationError,
} from '#services/boat_maintenance_task_service'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import BoatEngine from '#models/boat_engine'
import Organization from '#models/organization'
import User from '#models/user'
import Boat from '#models/boat'
import { DateTime } from 'luxon'

test.group('BoatMaintenanceTaskService (unit)', (group) => {
  group.each.teardown(async () => {
    await BoatMaintenanceTask.query().delete()
    await BoatEngine.query().delete()
    await Boat.query().delete()
    await User.query().delete()
    await Organization.query().delete()
  })

  test('createForBoat requires dueAt or dueEngineHours', async ({ assert }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-task-1' })
    const user = await User.create({
      email: 't1@example.com',
      password: 'Password123!',
      fullName: 'T1',
      organizationId: org.id,
    })
    const boat = await Boat.create({
      organizationId: org.id,
      name: 'B',
      registrationNumber: null,
      type: null,
    })

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
    const org = await Organization.create({ name: 'O', slug: 'o-task-2' })
    const user = await User.create({
      email: 't2@example.com',
      password: 'Password123!',
      fullName: 'T2',
      organizationId: org.id,
    })
    const boat = await Boat.create({
      organizationId: org.id,
      name: 'B',
      registrationNumber: null,
      type: null,
    })

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
    const org = await Organization.create({ name: 'O', slug: 'o-task-3' })
    const user = await User.create({
      email: 't3@example.com',
      password: 'Password123!',
      fullName: 'T3',
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
      hours: 100,
    })

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
    const orgA = await Organization.create({ name: 'OA', slug: 'o-task-a' })
    const orgB = await Organization.create({ name: 'OB', slug: 'o-task-b' })
    const userA = await User.create({
      email: 'ta@example.com',
      password: 'Password123!',
      fullName: 'TA',
      organizationId: orgA.id,
    })
    const userB = await User.create({
      email: 'tb@example.com',
      password: 'Password123!',
      fullName: 'TB',
      organizationId: orgB.id,
    })
    const boatA = await Boat.create({
      organizationId: orgA.id,
      name: 'BA',
      registrationNumber: null,
      type: null,
    })
    const boatB = await Boat.create({
      organizationId: orgB.id,
      name: 'BB',
      registrationNumber: null,
      type: null,
    })

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
