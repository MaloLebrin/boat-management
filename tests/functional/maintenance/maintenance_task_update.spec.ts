import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/utils/db'
import AuditLog from '#models/audit_log'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
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
    notes: 'Coque complète',
    status: 'open',
    dueAt: DateTime.fromISO('2026-10-01'),
    recurrenceIntervalMonths: 12,
    ...overrides,
  })
}

async function logsOf(organizationId: number, action: string) {
  return await AuditLog.query().where('organizationId', organizationId).where('action', action)
}

test.group('Maintenance tasks — update and postpone (#867)', (group) => {
  group.each.setup(() => truncateDb())

  test('PATCH edits the given fields, leaves the others intact and redirects back', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id)

    const response = await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}`)
      .form({ title: '  Antifouling + anodes ', recurrenceIntervalMonths: '24' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}`)
    await task.refresh()
    assert.equal(task.title, 'Antifouling + anodes')
    assert.equal(task.recurrenceIntervalMonths, 24)
    // Clés absentes : intactes.
    assert.equal(task.notes, 'Coque complète')
    assert.equal(task.dueAt?.toISODate(), '2026-10-01')
    assert.equal(task.postponedCount, 0)

    const [log] = await logsOf(admin.organizationId!, 'maintenance_task.update')
    assert.exists(log)
    assert.equal(log.entityId, task.id)
    assert.deepEqual(log.metadata, {
      name: 'Antifouling + anodes',
      boatName: boat.name,
      fields: ['title', 'recurrenceIntervalMonths'],
    })
  })

  test('an empty value clears a nullable field', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id)

    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({ notes: '', dueAt: '', recurrenceIntervalMonths: '' })
      .redirects(0)

    await task.refresh()
    assert.isNull(task.notes)
    assert.isNull(task.dueAt)
    assert.isNull(task.recurrenceIntervalMonths)
    // Retirer l'échéance n'est pas un report.
    assert.equal(task.postponedCount, 0)
  })

  test('moving the due date later is a postponement: counted and journalled as such', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id)

    for (const dueAt of ['2026-10-08', '2026-11-08']) {
      await client
        .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
        .loginAs(admin)
        .form({ dueAt })
        .redirects(0)
    }

    await task.refresh()
    assert.equal(task.dueAt?.toISODate(), '2026-11-08')
    assert.equal(task.postponedCount, 2)

    const postpones = await logsOf(admin.organizationId!, 'maintenance_task.postpone')
    assert.lengthOf(postpones, 2)
    assert.sameMembers(
      postpones.map((l) => l.metadata?.postponedCount),
      [1, 2]
    )
    assert.lengthOf(await logsOf(admin.organizationId!, 'maintenance_task.update'), 0)
  })

  test('bringing the due date forward is an update, not a postponement', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id)

    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({ dueAt: '2026-09-15' })
      .redirects(0)

    await task.refresh()
    assert.equal(task.dueAt?.toISODate(), '2026-09-15')
    assert.equal(task.postponedCount, 0)
    assert.lengthOf(await logsOf(admin.organizationId!, 'maintenance_task.update'), 1)
    assert.lengthOf(await logsOf(admin.organizationId!, 'maintenance_task.postpone'), 0)
  })

  test('a postponement bundled with another edit is journalled as an update', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id)

    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({ dueAt: '2026-12-01', title: 'Antifouling 2027' })
      .redirects(0)

    await task.refresh()
    assert.equal(task.postponedCount, 1)
    const [log] = await logsOf(admin.organizationId!, 'maintenance_task.update')
    assert.deepEqual(log.metadata?.fields, ['title', 'dueAt'])
    assert.equal(log.metadata?.postponedCount, 1)
  })

  test('submitting identical values writes nothing to the journal', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id)

    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({ title: 'Antifouling', dueAt: '2026-10-01' })
      .redirects(0)

    const count = await AuditLog.query()
      .where('organizationId', admin.organizationId!)
      .whereIn('action', ['maintenance_task.update', 'maintenance_task.postpone'])
    assert.lengthOf(count, 0)
  })

  test('a completed task is history and cannot be edited', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id, { status: 'done', doneAt: DateTime.now() })

    const response = await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({ title: 'Rewritten' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'A completed task is part of the history and can no longer be edited.'
    )
    await task.refresh()
    assert.equal(task.title, 'Antifouling')
  })

  test('an empty title is rejected by validation', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id)

    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({ title: '   ' })
      .redirects(0)

    await task.refresh()
    assert.equal(task.title, 'Antifouling')
  })

  test('engine hours: postponing the milestone counts, going below the counter is refused', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 480 }).create()
    const task = await openTask(boat.id, {
      subject: 'engine',
      boatEngineId: engine.id,
      dueAt: null,
      recurrenceIntervalMonths: null,
      dueEngineHours: 500,
      recurrenceIntervalEngineHours: 100,
    })

    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({ dueEngineHours: '520' })
      .redirects(0)

    await task.refresh()
    assert.equal(task.dueEngineHours, 520)
    assert.equal(task.postponedCount, 1)

    const refused = await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({ dueEngineHours: '450' })
      .redirects(0)

    refused.assertStatus(302)
    refused.assertFlashMessage('inputErrorsBag', {
      dueEngineHours: ["Must be greater than the engine's current hours (480 h)."],
    })
    await task.refresh()
    assert.equal(task.dueEngineHours, 520)
  })

  test('engine hours cannot be added to a task that is not an engine task', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id)

    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({ dueEngineHours: '900' })
      .redirects(0)

    await task.refresh()
    assert.isNull(task.dueEngineHours)
  })

  test('member and mechanic may edit; a boat owner may not', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id)

    const member = await createMemberUser(admin.organizationId!)
    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(member)
      .form({ title: 'By member' })
      .redirects(0)
    await task.refresh()
    assert.equal(task.title, 'By member')

    const mechanic = await createMechanicUser(admin.organizationId!)
    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(mechanic)
      .form({ title: 'By mechanic' })
      .redirects(0)
    await task.refresh()
    assert.equal(task.title, 'By mechanic')

    const owner = await createBoatOwnerUser(admin.organizationId!)
    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(owner)
      .form({ title: 'By owner' })
      .redirects(0)
    await task.refresh()
    assert.equal(task.title, 'By mechanic')
  })

  test('a boat of another organization is out of reach', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const other = await createAdminUser()
    const foreignBoat = await BoatFactory.merge({ organizationId: other.organizationId! }).create()
    const task = await openTask(foreignBoat.id)

    const response = await client
      .patch(`/boats/${foreignBoat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({ title: 'Hijacked' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
    await task.refresh()
    assert.equal(task.title, 'Antifouling')
  })

  test('a task of another boat of the same organization is not found', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const otherBoat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(otherBoat.id)

    const response = await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({ title: 'Wrong boat' })
      .redirects(0)

    response.assertFlashMessage('error', 'Task not found.')
    await task.refresh()
    assert.equal(task.title, 'Antifouling')
  })

  test('the next occurrence of a recurring task uses the edited interval', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await openTask(boat.id)

    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({ recurrenceIntervalMonths: '6', dueAt: '2026-10-20' })
      .redirects(0)
    await client
      .put(`/boats/${boat.id}/maintenance-tasks/${task.id}/done`)
      .loginAs(admin)
      .form({ doneAt: '2026-10-20' })
      .redirects(0)

    const next = await BoatMaintenanceTask.query()
      .where('boatId', boat.id)
      .where('status', 'open')
      .firstOrFail()
    assert.equal(next.dueAt?.toISODate(), '2027-04-20')
    assert.equal(next.recurrenceIntervalMonths, 6)
    // Chaque occurrence repart sans report.
    assert.equal(next.postponedCount, 0)
  })
})
