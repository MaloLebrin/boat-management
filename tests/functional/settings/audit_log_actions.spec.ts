import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { createHash } from 'node:crypto'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import OrganizationInvitation from '#models/organization_invitation'
import { BoatFactory } from '#database/factories/boat_factory'
import { OrganizationInvitationFactory } from '#database/factories/organization_invitation_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'
import type { AuditAction } from '#shared/types/audit_log'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

async function findLog(organizationId: number, action: AuditAction) {
  return await AuditLog.query()
    .where('organizationId', organizationId)
    .where('action', action)
    .first()
}

test.group('AuditLog — invitations (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST /organization/invitations logs invitation.send', async ({ client, assert }) => {
    const admin = await createAdminUser()

    await client
      .post('/organization/invitations')
      .loginAs(admin)
      .form({ email: 'newbie@example.com', role: 'member' })
      .redirects(0)

    const invitation = await OrganizationInvitation.query()
      .where('organizationId', admin.organizationId!)
      .where('email', 'newbie@example.com')
      .firstOrFail()

    const log = await findLog(admin.organizationId!, 'invitation.send')

    assert.isNotNull(log)
    assert.equal(log!.userId, admin.id)
    assert.equal(log!.entityType, 'invitation')
    assert.equal(log!.entityId, invitation.id)
    assert.deepEqual(log!.metadata, { email: 'newbie@example.com', role: 'member' })
  })

  test('DELETE /organization/invitations/:id logs invitation.cancel', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()

    const invitation = await OrganizationInvitationFactory.merge({
      email: 'cancelled@example.com',
      role: 'member',
      organizationId: admin.organizationId!,
      token: sha256('cancel-plain-token'),
      status: 'pending',
      expiresAt: DateTime.now().plus({ days: 7 }),
    }).create()

    await client.delete(`/organization/invitations/${invitation.id}`).loginAs(admin).redirects(0)

    const log = await findLog(admin.organizationId!, 'invitation.cancel')

    assert.isNotNull(log)
    assert.equal(log!.userId, admin.id)
    assert.equal(log!.entityId, invitation.id)
    assert.deepEqual(log!.metadata, { email: 'cancelled@example.com', role: 'member' })
  })

  test('DELETE /organization/invitations/:id logs nothing when the invitation is unknown', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()

    await client.delete('/organization/invitations/999999').loginAs(admin).redirects(0)

    const log = await findLog(admin.organizationId!, 'invitation.cancel')
    assert.isNull(log)
  })

  test('POST /invitations/accept logs invitation.accept on the inviting org', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const plainToken = 'accept-plain-token-audit-001'

    const invitation = await OrganizationInvitationFactory.merge({
      email: 'joiner@example.com',
      role: 'member',
      organizationId: admin.organizationId!,
      token: sha256(plainToken),
      status: 'pending',
      expiresAt: DateTime.now().plus({ days: 7 }),
    }).create()

    // L'invité arrive d'une autre organisation : l'entrée doit être rattachée
    // à celle de l'invitation, pas à son org d'origine.
    const invited = await UserFactory.with('organization', 1)
      .merge({ email: 'joiner@example.com' })
      .create()
    const previousOrgId = invited.organizationId!

    await client
      .post('/invitations/accept')
      .loginAs(invited)
      .form({ token: plainToken })
      .redirects(0)

    const log = await findLog(admin.organizationId!, 'invitation.accept')

    assert.isNotNull(log)
    assert.equal(log!.userId, invited.id)
    assert.equal(log!.entityId, invitation.id)
    assert.deepEqual(log!.metadata, { email: 'joiner@example.com', role: 'member' })

    const strayLog = await findLog(previousOrgId, 'invitation.accept')
    assert.isNull(strayLog)
  })
})

test.group('AuditLog — maintenance tasks (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST /boats/:boatId/maintenance-tasks logs maintenance_task.create', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()

    await client
      .post(`/boats/${boat.id}/maintenance-tasks`)
      .loginAs(admin)
      .form({ subject: 'engine', title: 'Vidange moteur', dueAt: '2026-09-01' })
      .redirects(0)

    const task = await BoatMaintenanceTask.query().where('boatId', boat.id).firstOrFail()
    const log = await findLog(admin.organizationId!, 'maintenance_task.create')

    assert.isNotNull(log)
    assert.equal(log!.userId, admin.id)
    assert.equal(log!.entityType, 'maintenance_task')
    assert.equal(log!.entityId, task.id)
    assert.deepEqual(log!.metadata, { name: 'Vidange moteur', boatName: boat.name })
  })

  test('PUT /boats/:boatId/maintenance-tasks/:taskId/done logs maintenance_task.complete', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'engine',
      title: 'Contrôle anodes',
      status: 'open',
    })

    await client
      .put(`/boats/${boat.id}/maintenance-tasks/${task.id}/done`)
      .loginAs(admin)
      .form({ doneAt: '2026-08-19' })
      .redirects(0)

    const log = await findLog(admin.organizationId!, 'maintenance_task.complete')

    assert.isNotNull(log)
    assert.equal(log!.userId, admin.id)
    assert.equal(log!.entityId, task.id)
    assert.deepEqual(log!.metadata, { name: 'Contrôle anodes', boatName: boat.name })
  })

  test('marking an already-done task done again does not log a second completion', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'engine',
      title: 'Contrôle anodes',
      status: 'done',
      doneAt: DateTime.now(),
    })

    await client
      .put(`/boats/${boat.id}/maintenance-tasks/${task.id}/done`)
      .loginAs(admin)
      .form({ doneAt: '2026-08-19' })
      .redirects(0)

    const count = await AuditLog.query()
      .where('organizationId', admin.organizationId!)
      .where('action', 'maintenance_task.complete')
      .count('* as total')

    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('DELETE /boats/:boatId/maintenance-tasks/:taskId logs maintenance_task.delete', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'hull',
      title: 'Carénage',
      status: 'open',
    })

    await client
      .delete(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .redirects(0)

    const log = await findLog(admin.organizationId!, 'maintenance_task.delete')

    assert.isNotNull(log)
    assert.equal(log!.userId, admin.id)
    assert.equal(log!.entityId, task.id)
    assert.deepEqual(log!.metadata, { name: 'Carénage', boatName: boat.name })
  })
})
