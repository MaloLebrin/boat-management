import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/utils/db'
import AuditLog from '#models/audit_log'
import Boat from '#models/boat'
import BoatIncident from '#models/boat_incident'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import BoatReservation from '#models/boat_reservation'
import BoatStatusChange from '#models/boat_status_change'
import Notification from '#models/notification'
import OrganizationMembership from '#models/organization_membership'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import QuotaService from '#services/quota_service'
import type { BoatStatus } from '#shared/types/boat_status'
import {
  createAdminUser,
  createBoatOwnerUser,
  createCharterAdminUser,
  createMechanicUser,
  createMemberUser,
  createStarterAdminUser,
} from '#tests/functional/helpers'
import app from '@adonisjs/core/services/app'

/** Créneau `datetime-local` dans `days` jours, sur `nights` nuits. */
function slot(days: number, nights = 2) {
  const start = DateTime.now().plus({ days }).set({ hour: 10, minute: 0 })
  return {
    startsAt: start.toFormat("yyyy-LL-dd'T'HH:mm"),
    endsAt: start.plus({ days: nights }).toFormat("yyyy-LL-dd'T'HH:mm"),
    tzOffsetMinutes: '0',
    clientName: 'Alice Martin',
  }
}

async function boatWithStatus(organizationId: number, status: BoatStatus = 'available') {
  return await BoatFactory.merge({
    organizationId,
    status,
    statusChangedAt: status === 'available' ? null : DateTime.now().minus({ days: 1 }),
  }).create()
}

async function logsOf(organizationId: number, action: string) {
  return await AuditLog.query().where('organizationId', organizationId).where('action', action)
}

test.group('Boat availability — status change (#870)', (group) => {
  group.each.setup(() => truncateDb())

  test('changing the status updates the boat, keeps a history row, journals and notifies', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const otherAdmin = await UserFactory.merge({ organizationId: admin.organizationId }).create()
    await OrganizationMembership.create({
      userId: otherAdmin.id,
      organizationId: admin.organizationId!,
      role: 'admin',
    })
    const owner = await createBoatOwnerUser(admin.organizationId!)
    const boat = await boatWithStatus(admin.organizationId!)
    await boat.related('owners').attach([owner.id])

    const response = await client
      .patch(`/boats/${boat.id}/status`)
      .loginAs(admin)
      .form({ status: 'out_of_service', reason: 'Moteur démonté' })
      .redirects(0)

    response.assertStatus(302)
    await boat.refresh()
    assert.equal(boat.status, 'out_of_service')
    assert.equal(boat.statusReason, 'Moteur démonté')
    assert.isNotNull(boat.statusChangedAt)

    const [change] = await BoatStatusChange.query().where('boatId', boat.id)
    assert.equal(change.fromStatus, 'available')
    assert.equal(change.toStatus, 'out_of_service')
    assert.equal(change.userId, admin.id)

    const [log] = await logsOf(admin.organizationId!, 'boat.status_change')
    assert.deepEqual(log.metadata, {
      name: boat.name,
      fromStatus: 'available',
      toStatus: 'out_of_service',
      reason: 'Moteur démonté',
    })

    const notifications = await Notification.query().where('type', 'boat.status_changed')
    const byUser = new Map(notifications.map((n) => [n.userId, n]))
    assert.isFalse(byUser.has(admin.id), 'the author is not notified')
    assert.equal(byUser.get(otherAdmin.id)?.actionUrl, `/boats/${boat.id}`)
    assert.equal(byUser.get(owner.id)?.actionUrl, `/owner/boats/${boat.id}`)
  })

  test('leaving maintenance sends « available again »', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    const boat = await boatWithStatus(admin.organizationId!, 'in_maintenance')
    await boat.related('owners').attach([owner.id])

    await client
      .patch(`/boats/${boat.id}/status`)
      .loginAs(admin)
      .form({ status: 'available' })
      .redirects(0)

    await boat.refresh()
    assert.equal(boat.status, 'available')
    assert.isNull(boat.statusReason)
    const notification = await Notification.query().where('userId', owner.id).firstOrFail()
    assert.equal(notification.type, 'boat.available_again')
  })

  test('setting the current status again is refused without a history row', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await boatWithStatus(admin.organizationId!)

    const response = await client
      .patch(`/boats/${boat.id}/status`)
      .loginAs(admin)
      .form({ status: 'available' })
      .redirects(0)

    response.assertFlashMessage('error', 'The boat already has this status.')
    assert.lengthOf(await BoatStatusChange.all(), 0)
  })

  test('an unknown status is rejected by validation', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await boatWithStatus(admin.organizationId!)

    await client
      .patch(`/boats/${boat.id}/status`)
      .loginAs(admin)
      .form({ status: 'archived' })
      .redirects(0)

    await boat.refresh()
    assert.equal(boat.status, 'available')
  })

  test('a member can change the status, a mechanic cannot', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const mechanic = await createMechanicUser(admin.organizationId!)
    const boat = await boatWithStatus(admin.organizationId!)

    await client
      .patch(`/boats/${boat.id}/status`)
      .loginAs(mechanic)
      .form({ status: 'out_of_service' })
      .redirects(0)
    await boat.refresh()
    assert.equal(boat.status, 'available')

    await client
      .patch(`/boats/${boat.id}/status`)
      .loginAs(member)
      .form({ status: 'in_maintenance' })
      .redirects(0)
    await boat.refresh()
    assert.equal(boat.status, 'in_maintenance')
  })

  test('a boat of another organization cannot be changed', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const stranger = await createAdminUser()
    const boat = await boatWithStatus(stranger.organizationId!)

    await client
      .patch(`/boats/${boat.id}/status`)
      .loginAs(admin)
      .form({ status: 'sold' })
      .redirects(0)

    await boat.refresh()
    assert.equal(boat.status, 'available')
  })

  test('the boat page exposes the availability summary and history', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await boatWithStatus(admin.organizationId!)
    await client
      .patch(`/boats/${boat.id}/status`)
      .loginAs(admin)
      .form({ status: 'in_maintenance', reason: 'Carénage' })
      .redirects(0)

    const response = await client.get(`/boats/${boat.id}`).loginAs(admin).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as {
      availability: { status: string; statusReason: string | null; windows: unknown[] }
      statusHistory: Array<{ toStatus: string; reason: string | null }>
    }
    assert.equal(props.availability.status, 'in_maintenance')
    assert.equal(props.availability.statusReason, 'Carénage')
    assert.lengthOf(props.availability.windows, 1)
    assert.equal(props.statusHistory[0].toStatus, 'in_maintenance')
  })
})

test.group('Boat availability — sold boats (#870)', (group) => {
  group.each.setup(() => truncateDb())

  test('a sold boat leaves the default list but stays reachable through the filter', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const active = await boatWithStatus(admin.organizationId!)
    const sold = await boatWithStatus(admin.organizationId!, 'sold')

    const list = await client.get('/boats').loginAs(admin).withInertia()
    const ids = (list.inertiaProps as { boats: { data: Array<{ id: number }> } }).boats.data.map(
      (b) => b.id
    )
    assert.deepEqual(ids, [active.id])

    const filtered = await client.get('/boats?status=sold').loginAs(admin).withInertia()
    const rows = (
      filtered.inertiaProps as { boats: { data: Array<{ id: number; status: string }> } }
    ).boats.data
    assert.deepEqual(
      rows.map((b) => [b.id, b.status]),
      [[sold.id, 'sold']]
    )
  })

  test('a sold boat no longer counts in the boat quota, and reactivating it does', async ({
    client,
    assert,
  }) => {
    const admin = await createStarterAdminUser()
    await admin.load('organization')
    await boatWithStatus(admin.organizationId!)
    await boatWithStatus(admin.organizationId!)
    const sold = await boatWithStatus(admin.organizationId!, 'sold')

    const quotaService = await app.container.make(QuotaService)
    assert.equal(await quotaService.countBoats(admin.organization), 2)

    // Starter : deux bateaux actifs, le plafond est atteint.
    await client
      .patch(`/boats/${sold.id}/status`)
      .loginAs(admin)
      .form({ status: 'available' })
      .redirects(0)

    await sold.refresh()
    assert.equal(sold.status, 'sold')
    assert.lengthOf(await BoatStatusChange.all(), 0)
  })

  test('a sold boat accepts no reservation, not even an option', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const boat = await boatWithStatus(admin.organizationId!, 'sold')

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .loginAs(admin)
      .form({ ...slot(10), status: 'option', forceReason: 'Client VIP' })
      .redirects(0)

    response.assertFlashMessage('error', 'This boat is sold: it no longer accepts reservations.')
    assert.lengthOf(await BoatReservation.all(), 0)
  })
})

test.group('Boat availability — reservation rule (#870)', (group) => {
  group.each.setup(() => truncateDb())

  test('a confirmed reservation is refused on an out-of-service boat, an option is accepted', async ({
    client,
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const boat = await boatWithStatus(admin.organizationId!, 'out_of_service')

    const refused = await client
      .post(`/boats/${boat.id}/reservations`)
      .loginAs(admin)
      .form({ ...slot(10), status: 'confirmed' })
      .redirects(0)

    refused.assertFlashMessage(
      'error',
      'Boat unavailable over this period (boat out of service). An option is still possible; an administrator can force the confirmation with a reason.'
    )
    assert.lengthOf(await BoatReservation.all(), 0)

    await client
      .post(`/boats/${boat.id}/reservations`)
      .loginAs(admin)
      .form({ ...slot(10), status: 'option' })
      .redirects(0)
    const [option] = await BoatReservation.all()
    assert.equal(option.status, 'option')
  })

  test('confirming an option on a boat in maintenance is refused', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const boat = await boatWithStatus(admin.organizationId!, 'in_maintenance')
    const option = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'option',
      startsAt: DateTime.now().plus({ days: 5 }),
      endsAt: DateTime.now().plus({ days: 7 }),
    }).create()

    await client
      .patch(`/boats/${boat.id}/reservations/${option.id}`)
      .loginAs(admin)
      .form({ status: 'confirmed' })
      .redirects(0)

    await option.refresh()
    assert.equal(option.status, 'option')
  })

  test('an existing confirmed reservation stays editable when the boat became unavailable', async ({
    client,
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const boat = await boatWithStatus(admin.organizationId!, 'out_of_service')
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'confirmed',
      startsAt: DateTime.now().plus({ days: 5 }),
      endsAt: DateTime.now().plus({ days: 7 }),
    }).create()

    await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
      .loginAs(admin)
      .form({ notes: 'Prévenir le client' })
      .redirects(0)

    await reservation.refresh()
    assert.equal(reservation.notes, 'Prévenir le client')
  })

  test('a dated open task blocks a confirmed reservation on its day only', async ({
    client,
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const boat = await boatWithStatus(admin.organizationId!)
    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'boat',
      title: 'Vidange',
      status: 'open',
      dueAt: DateTime.now().plus({ days: 11 }).startOf('day'),
    })

    await client
      .post(`/boats/${boat.id}/reservations`)
      .loginAs(admin)
      .form({ ...slot(10), status: 'confirmed' })
      .redirects(0)
    assert.lengthOf(await BoatReservation.all(), 0)

    await client
      .post(`/boats/${boat.id}/reservations`)
      .loginAs(admin)
      .form({ ...slot(20), status: 'confirmed' })
      .redirects(0)
    assert.lengthOf(await BoatReservation.all(), 1)
  })

  test('an open immobilizing incident blocks, a theft report does not', async ({
    client,
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const boat = await boatWithStatus(admin.organizationId!)
    const incident = await BoatIncident.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      occurredAt: DateTime.now().minus({ days: 1 }),
      type: 'theft_vandalism',
      description: 'Annexe volée',
      status: 'open',
    })

    await client
      .post(`/boats/${boat.id}/reservations`)
      .loginAs(admin)
      .form({ ...slot(10), status: 'confirmed' })
      .redirects(0)
    assert.lengthOf(await BoatReservation.all(), 1)

    incident.type = 'engine_failure'
    await incident.save()

    await client
      .post(`/boats/${boat.id}/reservations`)
      .loginAs(admin)
      .form({ ...slot(30), status: 'confirmed' })
      .redirects(0)
    assert.lengthOf(await BoatReservation.all(), 1)

    incident.status = 'closed'
    await incident.save()

    await client
      .post(`/boats/${boat.id}/reservations`)
      .loginAs(admin)
      .form({ ...slot(30), status: 'confirmed' })
      .redirects(0)
    assert.lengthOf(await BoatReservation.all(), 2)
  })

  test('an admin can force a confirmation with a reason, which is journaled', async ({
    client,
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const boat = await boatWithStatus(admin.organizationId!, 'in_maintenance')

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .loginAs(admin)
      .form({ ...slot(10), status: 'confirmed', forceReason: 'Moteur remonté vendredi' })
      .redirects(0)

    response.assertFlashMessage(
      'success',
      'Reservation confirmed despite the boat being unavailable — the override is recorded in the activity log.'
    )
    const [reservation] = await BoatReservation.all()
    assert.equal(reservation.status, 'confirmed')

    const [log] = await logsOf(admin.organizationId!, 'reservation.force_unavailable')
    assert.equal(log.entityId, reservation.id)
    assert.deepEqual(log.metadata, {
      boatName: boat.name,
      reason: 'Moteur remonté vendredi',
      windows: [{ source: 'status', label: 'in_maintenance', refId: null }],
    })
  })

  test('a member cannot force: the reason is ignored and the booking refused', async ({
    client,
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const boat = await boatWithStatus(admin.organizationId!, 'out_of_service')

    await client
      .post(`/boats/${boat.id}/reservations`)
      .loginAs(member)
      .form({ ...slot(10), status: 'confirmed', forceReason: 'Je force' })
      .redirects(0)

    assert.lengthOf(await BoatReservation.all(), 0)
    assert.lengthOf(await logsOf(admin.organizationId!, 'reservation.force_unavailable'), 0)
  })

  test('a force reason on an available boat is not journaled', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const boat = await boatWithStatus(admin.organizationId!)

    await client
      .post(`/boats/${boat.id}/reservations`)
      .loginAs(admin)
      .form({ ...slot(10), status: 'confirmed', forceReason: 'Par précaution' })
      .redirects(0)

    assert.lengthOf(await BoatReservation.all(), 1)
    assert.lengthOf(await logsOf(admin.organizationId!, 'reservation.force_unavailable'), 0)
  })

  test('the reservations page exposes availability and the force right', async ({
    client,
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const boat = await boatWithStatus(admin.organizationId!, 'out_of_service')

    const asAdmin = await client.get(`/boats/${boat.id}/reservations`).loginAs(admin).withInertia()
    const adminProps = asAdmin.inertiaProps as {
      availability: { status: string }
      canForceUnavailable: boolean
    }
    assert.equal(adminProps.availability.status, 'out_of_service')
    assert.isTrue(adminProps.canForceUnavailable)

    const asMember = await client
      .get(`/boats/${boat.id}/reservations`)
      .loginAs(member)
      .withInertia()
    assert.isFalse((asMember.inertiaProps as { canForceUnavailable: boolean }).canForceUnavailable)
  })
})

test.group('Boat model — status default (#870)', (group) => {
  group.each.setup(() => truncateDb())

  test('a new boat is available by default', async ({ assert }) => {
    const admin = await createAdminUser()
    const boat = await Boat.create({ organizationId: admin.organizationId!, name: 'Neuf' })
    await boat.refresh()
    assert.equal(boat.status, 'available')
  })
})
