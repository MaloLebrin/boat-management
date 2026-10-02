import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatBudgetEntryFactory } from '#database/factories/boat_budget_entry_factory'
import { BoatDocumentFactory } from '#database/factories/boat_document_factory'
import { BoatIncidentFactory } from '#database/factories/boat_incident_factory'
import { BoatMaintenanceTaskFactory } from '#database/factories/boat_maintenance_task_factory'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'
import AuditLog from '#models/audit_log'
import type Boat from '#models/boat'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import Notification from '#models/notification'
import type User from '#models/user'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser, createBoatOwnerUser, createMemberUser } from '#tests/functional/helpers'
import { assertPageContract } from '#tests/support/inertia_page'

/**
 * Portail propriétaire interactif (#890) : lecture étendue bornée, demandes,
 * accord sur un devis. L'accès repose entièrement sur le pivot `boat_owners` —
 * chaque test d'action a son témoin « bateau non rattaché ».
 */

async function ownedBoat(): Promise<{ admin: User; owner: User; boat: Boat }> {
  const admin = await createAdminUser()
  const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
  const owner = await createBoatOwnerUser(admin.organizationId!)
  await boat.related('owners').attach([owner.id])
  return { admin, owner, boat }
}

async function countOf(query: Promise<unknown[]>): Promise<number> {
  const rows = await query
  return rows.length
}

async function typesOf(user: User): Promise<string[]> {
  const rows = await Notification.query().where('userId', user.id).orderBy('id', 'asc')
  return rows.map((row) => row.type)
}

test.group('Owner portal — extended read (#890)', (group) => {
  group.each.setup(() => truncateDb())

  test('each new prop exposes only its bounded fields', async ({ client, assert }) => {
    const { owner, boat } = await ownedBoat()
    await BoatDocumentFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      cost: '480.00',
      notes: 'Négocié à la baisse',
      expiresAt: DateTime.now().plus({ days: 20 }),
    }).create()
    await BoatBudgetEntryFactory.merge({
      boatId: boat.id,
      visibleToOwner: true,
      description: 'Marge interne 15 %',
    }).create()
    await BoatIncidentFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      description: 'Rapport interne',
    }).create()
    await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'completed',
      arrivedAt: DateTime.now(),
      engineHoursStart: '100.0',
      engineHoursEnd: '103.5',
      notes: 'Client locataire : M. Dupont',
    }).create()

    const response = await client.get(`/owner/boats/${boat.id}`).loginAs(owner).withInertia()

    assertPageContract(assert, response, 'owner/boats/show')
    const props = response.inertiaProps as Record<string, Record<string, unknown>[]>
    assert.deepEqual(Object.keys(props.documents[0]).sort(), [
      'customTypeLabel',
      'expiresAt',
      'id',
      'issuedAt',
      'issuer',
      'referenceNumber',
      'type',
    ])
    assert.deepEqual(Object.keys(props.expenses[0]).sort(), [
      'amount',
      'category',
      'date',
      'id',
      'label',
    ])
    assert.deepEqual(Object.keys(props.incidents[0]).sort(), [
      'closedAt',
      'id',
      'occurredAt',
      'status',
      'type',
    ])
    assert.deepEqual(Object.keys(props.trips[0]).sort(), [
      'arrivalPortName',
      'arrivedAt',
      'departedAt',
      'departurePortName',
      'distanceNm',
      'engineHours',
      'id',
    ])
    assert.equal(props.trips[0].engineHours, 3.5)
    assert.notInclude(JSON.stringify(response.inertiaProps), 'Marge interne')
    assert.notInclude(JSON.stringify(response.inertiaProps), 'M. Dupont')
  })

  test('an internal expense never reaches the owner', async ({ client, assert }) => {
    const { owner, boat } = await ownedBoat()
    await BoatBudgetEntryFactory.merge({ boatId: boat.id, visibleToOwner: false }).create()
    const shared = await BoatBudgetEntryFactory.merge({
      boatId: boat.id,
      visibleToOwner: true,
      amount: '250.00',
      date: DateTime.now().minus({ months: 2 }),
    }).create()

    const response = await client.get(`/owner/boats/${boat.id}`).loginAs(owner).withInertia()

    const props = response.inertiaProps as {
      expenses: { id: number }[]
      dashboard: { totalCost12Months: number }
    }
    assert.deepEqual(
      props.expenses.map((e) => e.id),
      [shared.id]
    )
    assert.equal(props.dashboard.totalCost12Months, 250)
  })

  test('the dashboard lists the next deadlines and the last trip', async ({ client, assert }) => {
    const { owner, boat } = await ownedBoat()
    await BoatDocumentFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      type: 'insurance',
      customTypeLabel: null,
      expiresAt: DateTime.now().plus({ days: 40 }),
    }).create()
    await BoatMaintenanceTaskFactory.merge({
      boatId: boat.id,
      title: 'Carénage',
      status: 'open',
      dueAt: DateTime.now().plus({ days: 10 }),
    }).create()

    const response = await client.get(`/owner/boats/${boat.id}`).loginAs(owner).withInertia()

    const { dashboard } = response.inertiaProps as {
      dashboard: { upcomingDeadlines: { kind: string; label: string; documentType: string }[] }
    }
    assert.deepEqual(
      dashboard.upcomingDeadlines.map((d) => d.kind),
      ['task', 'document']
    )
    assert.equal(dashboard.upcomingDeadlines[0].label, 'Carénage')
    assert.equal(dashboard.upcomingDeadlines[1].documentType, 'insurance')
  })
})

test.group('Owner portal — requests (#890)', (group) => {
  group.each.setup(() => truncateDb())

  test('a request becomes a team task, journalled and notified', async ({ client, assert }) => {
    const { admin, owner, boat } = await ownedBoat()
    const member = await createMemberUser(admin.organizationId!)

    const response = await client
      .post(`/owner/boats/${boat.id}/requests`)
      .loginAs(owner)
      .form({ title: 'Pouvez-vous vérifier le guindeau ?', description: 'Il force à la remontée.' })
      .redirects(0)

    response.assertStatus(302)
    const task = await BoatMaintenanceTask.query().where('boatId', boat.id).firstOrFail()
    assert.equal(task.requestedByOwnerId, owner.id)
    assert.equal(task.status, 'open')
    assert.equal(task.notes, 'Il force à la remontée.')

    const log = await AuditLog.query()
      .where('action', 'maintenance_task.owner_request')
      .firstOrFail()
    assert.equal(log.userId, owner.id)
    assert.equal(log.entityId, task.id)

    assert.deepEqual(await typesOf(admin), ['owner.request_created'])
    assert.deepEqual(await typesOf(member), ['owner.request_created'])
    assert.deepEqual(await typesOf(owner), [])

    const page = await client.get(`/owner/boats/${boat.id}`).loginAs(owner).withInertia()
    const { requests } = page.inertiaProps as { requests: { id: number; status: string }[] }
    assert.deepEqual(requests, [{ ...requests[0], id: task.id, status: 'received' }])
  })

  test('a boat the owner does not own accepts no request', async ({ client, assert }) => {
    const { admin, owner } = await ownedBoat()
    const otherBoat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()

    const response = await client
      .post(`/owner/boats/${otherBoat.id}/requests`)
      .loginAs(owner)
      .form({ title: 'Une demande hors de son bateau' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/owner/boats')
    assert.equal(await countOf(BoatMaintenanceTask.query().where('boatId', otherBoat.id)), 0)
  })

  test('a request without a title is refused', async ({ client, assert }) => {
    const { owner, boat } = await ownedBoat()

    await client
      .post(`/owner/boats/${boat.id}/requests`)
      .loginAs(owner)
      .form({ title: '' })
      .redirects(0)

    assert.equal(await countOf(BoatMaintenanceTask.query().where('boatId', boat.id)), 0)
  })
})

test.group('Owner portal — quote approval (#890)', (group) => {
  group.each.setup(() => truncateDb())

  async function quotedTask(admin: User, boat: Boat, client: any) {
    const task = await BoatMaintenanceTaskFactory.merge({
      boatId: boat.id,
      title: 'Remplacement du guindeau',
      status: 'open',
    }).create()
    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({ estimatedCost: '1200' })
      .redirects(0)
    await task.refresh()
    return task
  }

  test('a cost above the threshold asks the owner, who approves', async ({ client, assert }) => {
    const { admin, owner, boat } = await ownedBoat()
    const task = await quotedTask(admin, boat, client)

    assert.equal(task.ownerApprovalStatus, 'pending')
    assert.deepEqual(await typesOf(owner), ['owner.approval_requested'])

    const response = await client
      .post(`/owner/boats/${boat.id}/tasks/${task.id}/approve`)
      .loginAs(owner)
      .redirects(0)

    response.assertStatus(302)
    await task.refresh()
    assert.equal(task.ownerApprovalStatus, 'approved')
    assert.equal(task.ownerApprovalDecidedBy, owner.id)
    assert.isNotNull(task.ownerApprovalDecidedAt)
    const log = await AuditLog.query()
      .where('action', 'maintenance_task.owner_approve')
      .firstOrFail()
    assert.equal(log.entityId, task.id)
    assert.deepEqual(await typesOf(admin), ['owner.approval_decided'])

    // Une décision prise ne se rejoue pas.
    await client.post(`/owner/boats/${boat.id}/tasks/${task.id}/reject`).loginAs(owner).redirects(0)
    await task.refresh()
    assert.equal(task.ownerApprovalStatus, 'approved')
  })

  test('the owner can reject, and a new cost asks again', async ({ client, assert }) => {
    const { admin, owner, boat } = await ownedBoat()
    const task = await quotedTask(admin, boat, client)

    await client.post(`/owner/boats/${boat.id}/tasks/${task.id}/reject`).loginAs(owner).redirects(0)
    await task.refresh()
    assert.equal(task.ownerApprovalStatus, 'rejected')
    assert.equal(
      await countOf(AuditLog.query().where('action', 'maintenance_task.owner_reject')),
      1
    )

    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .form({ estimatedCost: '900' })
      .redirects(0)
    await task.refresh()
    assert.equal(task.ownerApprovalStatus, 'pending')
    assert.isNull(task.ownerApprovalDecidedBy)
  })

  test('below the threshold, or without an owner, nothing is asked', async ({ client, assert }) => {
    const { admin, boat } = await ownedBoat()
    const cheap = await BoatMaintenanceTaskFactory.merge({
      boatId: boat.id,
      status: 'open',
    }).create()
    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${cheap.id}`)
      .loginAs(admin)
      .form({ estimatedCost: '120' })
      .redirects(0)
    await cheap.refresh()
    assert.isNull(cheap.ownerApprovalStatus)

    const ownerless = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const task = await quotedTask(admin, ownerless, client)
    assert.isNull(task.ownerApprovalStatus)
  })

  test("another owner cannot decide on a boat that isn't theirs", async ({ client, assert }) => {
    const { admin, boat } = await ownedBoat()
    const task = await quotedTask(admin, boat, client)
    const stranger = await createBoatOwnerUser(admin.organizationId!)

    const response = await client
      .post(`/owner/boats/${boat.id}/tasks/${task.id}/approve`)
      .loginAs(stranger)
      .redirects(0)

    response.assertHeader('location', '/owner/boats')
    await task.refresh()
    assert.equal(task.ownerApprovalStatus, 'pending')
  })

  test('a staff task that is not submitted cannot be approved', async ({ client, assert }) => {
    const { owner, boat } = await ownedBoat()
    const task = await BoatMaintenanceTaskFactory.merge({
      boatId: boat.id,
      status: 'open',
    }).create()

    await client
      .post(`/owner/boats/${boat.id}/tasks/${task.id}/approve`)
      .loginAs(owner)
      .redirects(0)

    await task.refresh()
    assert.isNull(task.ownerApprovalStatus)
  })
})
