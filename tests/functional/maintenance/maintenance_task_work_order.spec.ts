import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/utils/db'
import AuditLog from '#models/audit_log'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import Notification from '#models/notification'
import { BoatFactory } from '#database/factories/boat_factory'
import type { PlanningTask } from '#shared/types/planning'
import type { MaintenanceAssigneeOption } from '#shared/types/maintenance'
import {
  createAdminUser,
  createBoatOwnerUser,
  createMechanicUser,
  createMemberUser,
} from '#tests/functional/helpers'

async function openTask(boatId: number, overrides: Partial<BoatMaintenanceTask> = {}) {
  return await BoatMaintenanceTask.create({
    boatId,
    subject: 'boat',
    title: 'Antifouling',
    status: 'open',
    dueAt: DateTime.now().plus({ days: 10 }).startOf('day'),
    ...overrides,
  })
}

async function logsOf(organizationId: number, action: string) {
  return await AuditLog.query().where('organizationId', organizationId).where('action', action)
}

async function assignedNotificationsOf(userId: number) {
  return await Notification.query().where('userId', userId).where('type', 'maintenance.assigned')
}

test.group('Maintenance tasks — work orders (#868)', (group) => {
  group.each.setup(() => truncateDb())

  test('assigning a task to a mechanic records it, journals it and notifies them', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id)

    const response = await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({ assigneeId: String(mechanic.id) })
      .redirects(0)

    response.assertStatus(302)
    await task.refresh()
    assert.equal(task.assigneeId, mechanic.id)
    assert.isNotNull(task.assignedAt)

    const [log] = await logsOf(admin.organizationId!, 'maintenance_task.assign')
    assert.exists(log)
    assert.deepEqual(log.metadata, {
      name: 'Antifouling',
      boatName: boat.name,
      assigneeId: mechanic.id,
    })
    // Le changement de responsable seul n'ajoute pas de ligne `update`.
    assert.lengthOf(await logsOf(admin.organizationId!, 'maintenance_task.update'), 0)

    const [notification] = await assignedNotificationsOf(mechanic.id)
    assert.exists(notification)
    assert.equal(notification.organizationId, admin.organizationId)
    assert.equal(notification.actionUrl, `/planning?task=${task.id}`)
    assert.include(notification.title, 'Antifouling')
  })

  test('postponing while reassigning is still journalled as a postponement', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id)

    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({
        assigneeId: String(member.id),
        dueAt: task.dueAt!.plus({ weeks: 1 }).toISODate()!,
      })
      .redirects(0)

    assert.lengthOf(await logsOf(admin.organizationId!, 'maintenance_task.assign'), 1)
    const [postpone] = await logsOf(admin.organizationId!, 'maintenance_task.postpone')
    assert.deepEqual(postpone.metadata?.fields, ['dueAt'])
    assert.lengthOf(await logsOf(admin.organizationId!, 'maintenance_task.update'), 0)
  })

  test('a mechanic can pick a task up for themselves, without notifying themselves', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id)

    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(mechanic)
      .form({ assigneeId: String(mechanic.id) })
      .redirects(0)

    await task.refresh()
    assert.equal(task.assigneeId, mechanic.id)
    assert.lengthOf(await logsOf(admin.organizationId!, 'maintenance_task.assign'), 1)
    assert.lengthOf(await assignedNotificationsOf(mechanic.id), 0)
  })

  test('assigning a user of another organization is refused', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const outsider = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id)

    const response = await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({ assigneeId: String(outsider.id) })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'The selected member cannot be assigned maintenance tasks.'
    )
    await task.refresh()
    assert.isNull(task.assigneeId)
    assert.lengthOf(await assignedNotificationsOf(outsider.id), 0)
    assert.lengthOf(await logsOf(admin.organizationId!, 'maintenance_task.assign'), 0)
  })

  test('a boat owner cannot be assigned: their portal is read-only', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id)

    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({ assigneeId: String(owner.id) })
      .redirects(0)

    await task.refresh()
    assert.isNull(task.assigneeId)
  })

  test('an empty assignee unassigns the task, journalled without notification', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id, { assigneeId: member.id, assignedAt: DateTime.now() })

    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({ assigneeId: '' })
      .redirects(0)

    await task.refresh()
    assert.isNull(task.assigneeId)
    assert.isNull(task.assignedAt)
    const [log] = await logsOf(admin.organizationId!, 'maintenance_task.assign')
    assert.isNull(log.metadata?.assigneeId)
    assert.lengthOf(await assignedNotificationsOf(member.id), 0)
  })

  test('the provider and the estimates are edited like the other fields', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id)

    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({
        providerName: '  Chantier du port ',
        estimatedCost: '850.5',
        estimatedDurationMinutes: '240',
      })
      .redirects(0)

    await task.refresh()
    assert.equal(task.providerName, 'Chantier du port')
    assert.equal(Number(task.estimatedCost), 850.5)
    assert.equal(task.estimatedDurationMinutes, 240)

    const [log] = await logsOf(admin.organizationId!, 'maintenance_task.update')
    assert.deepEqual(log.metadata?.fields, [
      'providerName',
      'estimatedCost',
      'estimatedDurationMinutes',
    ])
  })

  test('an estimated duration of 0 is kept, not cleared', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id, { estimatedDurationMinutes: 60 })

    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({ estimatedDurationMinutes: '0' })
      .redirects(0)

    await task.refresh()
    assert.strictEqual(task.estimatedDurationMinutes, 0)
  })

  test('a negative or over-precise cost is rejected by validation', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id)

    for (const estimatedCost of ['-10', '12.345']) {
      const response = await client
        .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
        .loginAs(admin)
        .form({ estimatedCost })
        .redirects(0)
      response.assertStatus(302)
    }

    await task.refresh()
    assert.isNull(task.estimatedCost)
  })

  test('a task created with a work order stores it and notifies the assignee', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()

    await client
      .post(`/boats/${boat.id}/maintenance-tasks`)
      .loginAs(admin)
      .form({
        title: 'Révision moteur',
        assigneeId: String(member.id),
        providerName: 'Mécanique Marine',
        estimatedCost: '420',
        estimatedDurationMinutes: '',
      })
      .redirects(0)

    const task = await BoatMaintenanceTask.findByOrFail('boatId', boat.id)
    assert.equal(task.assigneeId, member.id)
    assert.equal(task.providerName, 'Mécanique Marine')
    assert.equal(Number(task.estimatedCost), 420)
    assert.isNull(task.estimatedDurationMinutes)
    assert.lengthOf(await assignedNotificationsOf(member.id), 1)
    assert.lengthOf(await logsOf(admin.organizationId!, 'maintenance_task.assign'), 1)
  })

  test('closing records the actuals; the next occurrence keeps the work order, not the actuals', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id, {
      recurrenceIntervalMonths: 12,
      assigneeId: mechanic.id,
      assignedAt: DateTime.now(),
      providerName: 'Chantier du port',
      estimatedCost: '800',
      estimatedDurationMinutes: 180,
    })

    await client
      .put(`/boats/${boat.id}/maintenance-tasks/${task.id}/done`)
      .loginAs(mechanic)
      .form({ actualCost: '912.40', actualDurationMinutes: '210' })
      .redirects(0)

    await task.refresh()
    assert.equal(task.status, 'done')
    assert.equal(Number(task.actualCost), 912.4)
    assert.equal(task.actualDurationMinutes, 210)

    const next = await BoatMaintenanceTask.query()
      .where('boatId', boat.id)
      .where('status', 'open')
      .firstOrFail()
    assert.equal(next.assigneeId, mechanic.id)
    assert.equal(next.providerName, 'Chantier du port')
    assert.equal(Number(next.estimatedCost), 800)
    assert.equal(next.estimatedDurationMinutes, 180)
    assert.isNull(next.actualCost)
    assert.isNull(next.actualDurationMinutes)
  })

  test('the planning exposes each assignee and the members a task can be given to', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    await createBoatOwnerUser(admin.organizationId!)
    await createAdminUser() // autre organisation
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id, { assigneeId: mechanic.id, providerName: 'Voilerie' })

    const response = await client.get('/planning').loginAs(mechanic).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as {
      tasks: PlanningTask[]
      maintenanceAssignees: MaintenanceAssigneeOption[]
    }
    const row = props.tasks.find((t) => t.id === task.id)!
    assert.equal(row.assignee?.id, mechanic.id)
    assert.equal(row.providerName, 'Voilerie')
    // Admin et mécanicien : oui. Propriétaire et autre organisation : non.
    assert.sameMembers(
      props.maintenanceAssignees.map((a) => a.id),
      [admin.id, mechanic.id]
    )
  })

  test('the planning keeps each assignee’s latest done tasks and their exact total', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const done = { status: 'done' as const, doneAt: DateTime.now() }
    const mechanicDone = await Promise.all(
      [1, 2, 3].map(() => openTask(boat.id, { ...done, assigneeId: mechanic.id }))
    )
    // Les tâches du mécanicien sont plus anciennes que les 21 non assignées :
    // hors du top 20 de la flotte.
    await BoatMaintenanceTask.query()
      .whereIn(
        'id',
        mechanicDone.map((t) => t.id)
      )
      .update({ updatedAt: DateTime.now().minus({ days: 30 }) })
    for (let index = 0; index < 21; index++) await openTask(boat.id, done)

    const response = await client.get('/planning').loginAs(admin).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as {
      doneTasks: PlanningTask[]
      doneTasksTotal: number
      doneTasksTotalByAssignee: Record<string, number>
    }
    const ids = props.doneTasks.map((t) => t.id)
    for (const task of mechanicDone) assert.include(ids, task.id)
    assert.lengthOf(props.doneTasks, 23)
    assert.equal(props.doneTasksTotal, 24)
    assert.deepEqual(props.doneTasksTotalByAssignee, {
      unassigned: 21,
      [String(mechanic.id)]: 3,
    })
  })

  test('the planned-tasks CSV carries the work order columns', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    await openTask(boat.id, {
      assigneeId: member.id,
      providerName: 'Chantier du port',
      estimatedCost: '800',
    })

    const response = await client
      .get(`/boats/${boat.id}/export/maintenance-tasks.csv`)
      .loginAs(admin)

    response.assertStatus(200)
    const [header, line] = response
      .text()
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
    assert.include(header, 'assignee')
    assert.include(header, 'estimated_cost')
    assert.include(line, 'Chantier du port')
    assert.include(line, '800.00')
    assert.include(line, member.fullName ?? member.email)
  })
})
