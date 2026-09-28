import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import OrganizationMembership from '#models/organization_membership'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser, createMechanicUser } from '#tests/functional/helpers'
import { DateTime } from 'luxon'
import type User from '#models/user'

/**
 * Un membre retiré, ou rétrogradé vers un rôle sans `maintenance.edit`, ne
 * garde pas ses tâches ouvertes (#868) : sinon le scan quotidien continue de
 * le notifier et les admins ne reçoivent plus les rappels d'échéance.
 */
async function assignedTask(
  boatId: number,
  assignee: User,
  status: 'open' | 'done'
): Promise<BoatMaintenanceTask> {
  return BoatMaintenanceTask.create({
    boatId,
    subject: 'hull',
    title: `Tâche ${status}`,
    status,
    dueAt: DateTime.now().plus({ days: 3 }),
    doneAt: status === 'done' ? DateTime.now() : null,
    dueEngineHours: null,
    assigneeId: assignee.id,
    assignedAt: DateTime.now(),
  })
}

async function membershipOf(user: User): Promise<OrganizationMembership> {
  return OrganizationMembership.query()
    .where('userId', user.id)
    .where('organizationId', user.organizationId!)
    .firstOrFail()
}

test.group('Organization members — désassignation des tâches (#868)', (group) => {
  group.each.setup(() => truncateDb())

  test('retirer un membre libère ses tâches ouvertes et garde l’historique des terminées', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const open = await assignedTask(boat.id, mechanic, 'open')
    const done = await assignedTask(boat.id, mechanic, 'done')

    const otherAdmin = await createAdminUser()
    await OrganizationMembership.create({
      userId: mechanic.id,
      organizationId: otherAdmin.organizationId!,
      role: 'mechanic',
    })
    const otherBoat = await BoatFactory.merge({
      organizationId: otherAdmin.organizationId!,
    }).create()
    const foreign = await assignedTask(otherBoat.id, mechanic, 'open')

    const membership = await membershipOf(mechanic)
    const response = await client
      .delete(`/organization/members/${membership.id}`)
      .loginAs(admin)
      .redirects(0)
    response.assertStatus(302)

    await Promise.all([open.refresh(), done.refresh(), foreign.refresh()])
    assert.isNull(open.assigneeId)
    assert.isNull(open.assignedAt)
    assert.equal(done.assigneeId, mechanic.id)
    // Sa tâche dans une autre organisation n'est pas concernée.
    assert.equal(foreign.assigneeId, mechanic.id)
  })

  test('rétrograder vers un rôle sans maintenance.edit libère ses tâches ouvertes', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const open = await assignedTask(boat.id, mechanic, 'open')

    const membership = await membershipOf(mechanic)
    const response = await client
      .put(`/organization/members/${membership.id}`)
      .loginAs(admin)
      .form({ role: 'boat_owner' })
      .redirects(0)
    response.assertStatus(302)

    await open.refresh()
    assert.isNull(open.assigneeId)
  })

  test('un changement vers un rôle qui garde maintenance.edit conserve l’assignation', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const open = await assignedTask(boat.id, mechanic, 'open')

    const membership = await membershipOf(mechanic)
    const response = await client
      .put(`/organization/members/${membership.id}`)
      .loginAs(admin)
      .form({ role: 'member' })
      .redirects(0)
    response.assertStatus(302)

    await open.refresh()
    assert.equal(open.assigneeId, mechanic.id)
  })
})
