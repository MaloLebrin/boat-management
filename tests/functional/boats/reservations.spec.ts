import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { BoatFactory } from '#database/factories/boat_factory'
import { UserFactory } from '#database/factories/user_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { createAdminUser } from '#tests/functional/helpers'
import BoatReservation from '#models/boat_reservation'
import OrganizationMembership from '#models/organization_membership'

const VALID_RESERVATION = {
  startsAt: '2025-08-01T10:00',
  endsAt: '2025-08-10T10:00',
  clientName: 'Alice Martin',
  clientEmail: 'alice@example.com',
  status: 'option',
}

test.group('Boat Reservations (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  // --- index ---

  test('GET /boats/:boatId/reservations renders reservations page for authorized user', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}/reservations`).loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('boats/reservations')
  })

  test('GET /boats/:boatId/reservations redirects to /login when unauthenticated', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}/reservations`).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  // --- store ---

  test('POST /boats/:boatId/reservations creates reservation for authorized user', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .form(VALID_RESERVATION)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const reservations = await BoatReservation.query().where('boatId', boat.id)
    assert.lengthOf(reservations, 1)
    assert.equal(reservations[0].clientName, 'Alice Martin')
    assert.equal(reservations[0].status, 'option')
  })

  test('POST /boats/:boatId/reservations redirects to /login when unauthenticated', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .form(VALID_RESERVATION)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('POST /boats/:boatId/reservations redirects to /boats when boat not found', async ({
    client,
  }) => {
    const user = await createAdminUser()

    const response = await client
      .post('/boats/999999/reservations')
      .form(VALID_RESERVATION)
      .loginAs(user)

    response.assertRedirectsTo('/boats')
  })

  test('POST /boats/:boatId/reservations rejects when boat belongs to another org', async ({
    client,
    assert,
  }) => {
    const owner = await createAdminUser()
    const other = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .form(VALID_RESERVATION)
      .loginAs(other)

    response.assertRedirectsTo('/boats')

    const reservations = await BoatReservation.query().where('boatId', boat.id)
    assert.lengthOf(reservations, 0)
  })

  test('POST /boats/:boatId/reservations validates required fields', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .form({ startsAt: '', endsAt: '', clientName: '' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const reservations = await BoatReservation.query().where('boatId', boat.id)
    assert.lengthOf(reservations, 0)
  })

  test('POST /boats/:boatId/reservations flashes error when conflict with confirmed reservation', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await BoatReservation.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'confirmed',
      startsAt: DateTime.fromISO('2025-08-01T10:00:00'),
      endsAt: DateTime.fromISO('2025-08-10T10:00:00'),
      clientName: 'First Client',
    })

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .form({
        startsAt: '2025-08-05T10:00',
        endsAt: '2025-08-15T10:00',
        clientName: 'Second Client',
        status: 'option',
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const reservations = await BoatReservation.query().where('boatId', boat.id)
    assert.lengthOf(reservations, 1)
  })

  test('POST /boats/:boatId/reservations allows overlap when existing is cancelled', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await BoatReservation.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'cancelled',
      startsAt: DateTime.fromISO('2025-08-01T10:00:00'),
      endsAt: DateTime.fromISO('2025-08-10T10:00:00'),
      clientName: 'Cancelled Client',
    })

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .form({
        startsAt: '2025-08-05T10:00',
        endsAt: '2025-08-15T10:00',
        clientName: 'New Client',
        status: 'option',
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const reservations = await BoatReservation.query().where('boatId', boat.id)
    assert.lengthOf(reservations, 2)
  })

  test('POST /boats/:boatId/reservations flashes error when end is before start', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .form({
        startsAt: '2025-08-10T10:00',
        endsAt: '2025-08-01T10:00',
        clientName: 'Bad Dates Client',
        status: 'option',
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'End date must be after start date.')

    const reservations = await BoatReservation.query().where('boatId', boat.id)
    assert.lengthOf(reservations, 0)
  })

  test('POST /boats/:boatId/reservations allows non-admin same-org member to store', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await UserFactory.merge({ organizationId: admin.organizationId! }).create()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .form(VALID_RESERVATION)
      .loginAs(member)
      .redirects(0)

    response.assertStatus(302)

    const reservations = await BoatReservation.query().where('boatId', boat.id)
    assert.lengthOf(reservations, 1)
  })

  // --- update ---

  test('PATCH /boats/:boatId/reservations/:id updates status to confirmed', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const reservation = await BoatReservation.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'option',
      startsAt: DateTime.fromISO('2025-09-01T10:00:00'),
      endsAt: DateTime.fromISO('2025-09-07T10:00:00'),
      clientName: 'Update Client',
    })

    const response = await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
      .form({ status: 'confirmed' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    await reservation.refresh()
    assert.equal(reservation.status, 'confirmed')
  })

  test('PATCH /boats/:boatId/reservations/:id rejects cross-org attempt', async ({
    client,
    assert,
  }) => {
    const owner = await createAdminUser()
    const other = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()

    const reservation = await BoatReservation.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'option',
      startsAt: DateTime.fromISO('2025-09-01T10:00:00'),
      endsAt: DateTime.fromISO('2025-09-07T10:00:00'),
      clientName: 'Cross Org Update Client',
    })

    const response = await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
      .form({ status: 'confirmed' })
      .loginAs(other)

    response.assertRedirectsTo('/boats')

    await reservation.refresh()
    assert.equal(reservation.status, 'option')
  })

  test('PATCH /boats/:boatId/reservations/:id returns 302 when reservation not found', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .patch(`/boats/${boat.id}/reservations/999999`)
      .form({ status: 'confirmed' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
  })

  test('PATCH /boats/:boatId/reservations/:id flashes error when end is before start', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const reservation = await BoatReservation.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'option',
      startsAt: DateTime.fromISO('2025-09-01T10:00:00'),
      endsAt: DateTime.fromISO('2025-09-07T10:00:00'),
      clientName: 'Date Order Client',
    })

    const response = await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
      .form({
        startsAt: '2025-09-10T10:00',
        endsAt: '2025-09-05T10:00',
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    await reservation.refresh()
    assert.equal(reservation.startsAt.toISODate(), '2025-09-01')
  })

  test('PATCH /boats/:boatId/reservations/:id detects conflict on reschedule', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await BoatReservation.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'confirmed',
      startsAt: DateTime.fromISO('2025-10-01T10:00:00'),
      endsAt: DateTime.fromISO('2025-10-10T10:00:00'),
      clientName: 'Blocking Client',
    })

    const reservation = await BoatReservation.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'option',
      startsAt: DateTime.fromISO('2025-10-15T10:00:00'),
      endsAt: DateTime.fromISO('2025-10-20T10:00:00'),
      clientName: 'Moving Client',
    })

    const response = await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
      .form({
        startsAt: '2025-10-05T10:00',
        endsAt: '2025-10-18T10:00',
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    await reservation.refresh()
    assert.equal(reservation.startsAt.toISODate(), '2025-10-15')
  })

  // --- destroy ---

  test('DELETE /boats/:boatId/reservations/:id deletes the reservation', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const reservation = await BoatReservation.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'option',
      startsAt: DateTime.fromISO('2025-11-01T10:00:00'),
      endsAt: DateTime.fromISO('2025-11-07T10:00:00'),
      clientName: 'Delete Client',
    })

    const response = await client
      .delete(`/boats/${boat.id}/reservations/${reservation.id}`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const deleted = await BoatReservation.find(reservation.id)
    assert.isNull(deleted)
  })

  test('DELETE /boats/:boatId/reservations/:id redirects to /login when unauthenticated', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const reservation = await BoatReservation.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'option',
      startsAt: DateTime.fromISO('2025-11-01T10:00:00'),
      endsAt: DateTime.fromISO('2025-11-07T10:00:00'),
      clientName: 'Unauth Client',
    })

    const response = await client
      .delete(`/boats/${boat.id}/reservations/${reservation.id}`)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('DELETE /boats/:boatId/reservations/:id rejects cross-org attempt', async ({
    client,
    assert,
  }) => {
    const owner = await createAdminUser()
    const other = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()

    const reservation = await BoatReservation.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'option',
      startsAt: DateTime.fromISO('2025-11-01T10:00:00'),
      endsAt: DateTime.fromISO('2025-11-07T10:00:00'),
      clientName: 'Cross Org Client',
    })

    const response = await client
      .delete(`/boats/${boat.id}/reservations/${reservation.id}`)
      .loginAs(other)

    response.assertRedirectsTo('/boats')

    const existing = await BoatReservation.find(reservation.id)
    assert.isNotNull(existing)
  })

  test('DELETE /boats/:boatId/reservations/:id is rejected for non-admin member when confirmed', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'confirmed',
    }).create()

    const member = await UserFactory.merge({ organizationId: admin.organizationId! }).create()
    await OrganizationMembership.create({
      userId: member.id,
      organizationId: admin.organizationId!,
      role: 'member',
    })

    const response = await client
      .delete(`/boats/${boat.id}/reservations/${reservation.id}`)
      .loginAs(member)
      .redirects(0)

    response.assertStatus(302)

    const existing = await BoatReservation.find(reservation.id)
    assert.isNotNull(existing)
  })

  test('DELETE /boats/:boatId/reservations/:id allows non-admin member when not confirmed', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'option',
    }).create()

    const member = await UserFactory.merge({ organizationId: admin.organizationId! }).create()
    await OrganizationMembership.create({
      userId: member.id,
      organizationId: admin.organizationId!,
      role: 'member',
    })

    const response = await client
      .delete(`/boats/${boat.id}/reservations/${reservation.id}`)
      .loginAs(member)
      .redirects(0)

    response.assertStatus(302)

    const existing = await BoatReservation.find(reservation.id)
    assert.isNull(existing)
  })

  test('DELETE /boats/:boatId/reservations/:id allows admin to delete confirmed reservation', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'confirmed',
    }).create()

    const response = await client
      .delete(`/boats/${boat.id}/reservations/${reservation.id}`)
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)

    const existing = await BoatReservation.find(reservation.id)
    assert.isNull(existing)
  })

  // --- fleet index ---

  test('GET /reservations redirects to /login when unauthenticated', async ({ client }) => {
    const response = await client.get('/reservations').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET /reservations renders fleet reservations page', async ({ client }) => {
    const user = await createAdminUser()

    const response = await client.get('/reservations').loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('reservations/index')
  })

  test('GET /reservations returns reservations from org boats', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat1 = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const boat2 = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await BoatReservation.create({
      boatId: boat1.id,
      organizationId: user.organizationId!,
      status: 'confirmed',
      startsAt: DateTime.fromISO('2025-12-01T10:00:00'),
      endsAt: DateTime.fromISO('2025-12-07T10:00:00'),
      clientName: 'Fleet Client 1',
    })

    await BoatReservation.create({
      boatId: boat2.id,
      organizationId: user.organizationId!,
      status: 'option',
      startsAt: DateTime.fromISO('2025-12-10T10:00:00'),
      endsAt: DateTime.fromISO('2025-12-15T10:00:00'),
      clientName: 'Fleet Client 2',
    })

    const response = await client.get('/reservations').loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as { reservations: unknown[] }
    assert.lengthOf(props.reservations, 2)
  })

  test('GET /reservations does not return reservations from another org', async ({
    client,
    assert,
  }) => {
    const owner = await createAdminUser()
    const other = await UserFactory.with('organization').create()
    const ownerBoat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()
    const otherBoat = await BoatFactory.merge({ organizationId: other.organizationId! }).create()

    await BoatReservation.create({
      boatId: ownerBoat.id,
      organizationId: owner.organizationId!,
      status: 'confirmed',
      startsAt: DateTime.fromISO('2026-02-01T10:00:00'),
      endsAt: DateTime.fromISO('2026-02-07T10:00:00'),
      clientName: 'Owner Client',
    })

    await BoatReservation.create({
      boatId: otherBoat.id,
      organizationId: other.organizationId!,
      status: 'confirmed',
      startsAt: DateTime.fromISO('2026-02-10T10:00:00'),
      endsAt: DateTime.fromISO('2026-02-15T10:00:00'),
      clientName: 'Other Org Client',
    })

    const response = await client.get('/reservations').loginAs(other).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as { reservations: { clientName: string }[] }
    assert.lengthOf(props.reservations, 1)
    assert.equal(props.reservations[0].clientName, 'Other Org Client')
  })

  test('GET /reservations groups calendarEntries per boat', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat1 = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const boat2 = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await BoatReservation.create({
      boatId: boat1.id,
      organizationId: user.organizationId!,
      status: 'confirmed',
      startsAt: DateTime.fromISO('2026-03-01T10:00:00'),
      endsAt: DateTime.fromISO('2026-03-07T10:00:00'),
      clientName: 'Calendar Client 1',
    })

    await BoatReservation.create({
      boatId: boat1.id,
      organizationId: user.organizationId!,
      status: 'option',
      startsAt: DateTime.fromISO('2026-03-10T10:00:00'),
      endsAt: DateTime.fromISO('2026-03-15T10:00:00'),
      clientName: 'Calendar Client 2',
    })

    await BoatReservation.create({
      boatId: boat2.id,
      organizationId: user.organizationId!,
      status: 'confirmed',
      startsAt: DateTime.fromISO('2026-03-05T10:00:00'),
      endsAt: DateTime.fromISO('2026-03-12T10:00:00'),
      clientName: 'Calendar Client 3',
    })

    const response = await client.get('/reservations').loginAs(user).withInertia()

    response.assertStatus(200)

    type CalendarEntry = { boatId: number; boatName: string; reservations: unknown[] }
    const props = response.inertiaProps as { calendarEntries: CalendarEntry[] }

    assert.lengthOf(props.calendarEntries, 2)

    const entry1 = props.calendarEntries.find((e) => e.boatId === boat1.id)
    const entry2 = props.calendarEntries.find((e) => e.boatId === boat2.id)

    assert.isDefined(entry1)
    assert.isDefined(entry2)
    assert.lengthOf(entry1!.reservations, 2)
    assert.lengthOf(entry2!.reservations, 1)
  })

  test('GET /reservations?boatId= filters by boat', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat1 = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const boat2 = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await BoatReservation.create({
      boatId: boat1.id,
      organizationId: user.organizationId!,
      status: 'confirmed',
      startsAt: DateTime.fromISO('2026-01-01T10:00:00'),
      endsAt: DateTime.fromISO('2026-01-07T10:00:00'),
      clientName: 'Boat1 Client',
    })

    await BoatReservation.create({
      boatId: boat2.id,
      organizationId: user.organizationId!,
      status: 'option',
      startsAt: DateTime.fromISO('2026-01-10T10:00:00'),
      endsAt: DateTime.fromISO('2026-01-15T10:00:00'),
      clientName: 'Boat2 Client',
    })

    const response = await client
      .get(`/reservations?boatId=${boat1.id}`)
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as { reservations: { boatId: number }[] }
    assert.lengthOf(props.reservations, 1)
    assert.equal(props.reservations[0].boatId, boat1.id)
  })

  // --- C1: permissions membres non-admin ---

  test('PATCH /boats/:boatId/reservations/:id allows non-admin same-org member to update', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await UserFactory.merge({ organizationId: admin.organizationId! }).create()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()

    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'option',
      startsAt: DateTime.fromISO('2025-09-01T10:00:00'),
      endsAt: DateTime.fromISO('2025-09-07T10:00:00'),
    }).create()

    const response = await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
      .form({ status: 'confirmed' })
      .loginAs(member)
      .redirects(0)

    response.assertStatus(302)

    await reservation.refresh()
    assert.equal(reservation.status, 'confirmed')
  })

  test('DELETE /boats/:boatId/reservations/:id allows non-admin same-org member to delete', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await UserFactory.merge({ organizationId: admin.organizationId! }).create()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()

    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'option',
      startsAt: DateTime.fromISO('2025-11-01T10:00:00'),
      endsAt: DateTime.fromISO('2025-11-07T10:00:00'),
    }).create()

    const response = await client
      .delete(`/boats/${boat.id}/reservations/${reservation.id}`)
      .loginAs(member)
      .redirects(0)

    response.assertStatus(302)

    const deleted = await BoatReservation.find(reservation.id)
    assert.isNull(deleted)
  })

  // --- C2: validations de format ---

  test('POST /boats/:boatId/reservations rejects invalid email format', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .form({ ...VALID_RESERVATION, clientEmail: 'not-an-email' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const reservations = await BoatReservation.query().where('boatId', boat.id)
    assert.lengthOf(reservations, 0)
  })

  test('POST /boats/:boatId/reservations rejects negative totalPrice', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .form({ ...VALID_RESERVATION, totalPrice: -100 })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const reservations = await BoatReservation.query().where('boatId', boat.id)
    assert.lengthOf(reservations, 0)
  })

  test('POST /boats/:boatId/reservations accepts totalPrice of 0', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .form({ ...VALID_RESERVATION, totalPrice: 0 })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const reservation = await BoatReservation.query().where('boatId', boat.id).firstOrFail()
    assert.equal(reservation.totalPrice, '0.00')
  })

  test('POST /boats/:boatId/reservations rejects clientPhone longer than 50 chars', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .form({ ...VALID_RESERVATION, clientPhone: 'a'.repeat(51) })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const reservations = await BoatReservation.query().where('boatId', boat.id)
    assert.lengthOf(reservations, 0)
  })

  test('POST /boats/:boatId/reservations rejects invalid status value', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .form({ ...VALID_RESERVATION, status: 'pending' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const reservations = await BoatReservation.query().where('boatId', boat.id)
    assert.lengthOf(reservations, 0)
  })

  test('POST /boats/:boatId/reservations flashes error when overlap with existing option reservation', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await BoatReservation.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'option',
      startsAt: DateTime.fromISO('2025-08-01T10:00:00'),
      endsAt: DateTime.fromISO('2025-08-10T10:00:00'),
      clientName: 'Existing Option Client',
    })

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .form({
        startsAt: '2025-08-05T10:00',
        endsAt: '2025-08-15T10:00',
        clientName: 'Conflicting Client',
        status: 'option',
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const reservations = await BoatReservation.query().where('boatId', boat.id)
    assert.lengthOf(reservations, 1)
  })

  // --- C-01: PATCH partiel ne doit pas effacer les champs optionnels ---

  test('PATCH /boats/:boatId/reservations/:id preserves optional fields on partial update', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const reservation = await BoatReservation.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'option',
      startsAt: DateTime.fromISO('2025-09-01T10:00:00'),
      endsAt: DateTime.fromISO('2025-09-07T10:00:00'),
      clientName: 'Partial Update Client',
      clientEmail: 'partial@example.com',
      clientPhone: '+33600000000',
      notes: 'Initial notes',
      totalPrice: '1500.00',
    })

    const response = await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
      .form({ status: 'confirmed' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    await reservation.refresh()
    assert.equal(reservation.status, 'confirmed')
    assert.equal(reservation.clientEmail, 'partial@example.com')
    assert.equal(reservation.clientPhone, '+33600000000')
    assert.equal(reservation.notes, 'Initial notes')
    assert.equal(reservation.totalPrice, '1500.00')
  })

  // --- C3: transitions de statut ---

  test('PATCH /boats/:boatId/reservations/:id transitions status from option to cancelled', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const reservation = await BoatReservation.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'option',
      startsAt: DateTime.fromISO('2025-09-01T10:00:00'),
      endsAt: DateTime.fromISO('2025-09-07T10:00:00'),
      clientName: 'Cancel Option Client',
    })

    const response = await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
      .form({ status: 'cancelled' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    await reservation.refresh()
    assert.equal(reservation.status, 'cancelled')
  })

  test('PATCH /boats/:boatId/reservations/:id transitions status from confirmed to cancelled', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const reservation = await BoatReservation.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'confirmed',
      startsAt: DateTime.fromISO('2025-09-01T10:00:00'),
      endsAt: DateTime.fromISO('2025-09-07T10:00:00'),
      clientName: 'Cancel Confirmed Client',
    })

    const response = await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
      .form({ status: 'cancelled' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    await reservation.refresh()
    assert.equal(reservation.status, 'cancelled')
  })

  test('PATCH /boats/:boatId/reservations/:id transitions status from confirmed to option', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const reservation = await BoatReservation.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'confirmed',
      startsAt: DateTime.fromISO('2025-09-01T10:00:00'),
      endsAt: DateTime.fromISO('2025-09-07T10:00:00'),
      clientName: 'Downgrade Client',
    })

    const response = await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
      .form({ status: 'option' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    await reservation.refresh()
    assert.equal(reservation.status, 'option')
  })
})
