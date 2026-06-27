import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { BoatFactory } from '#database/factories/boat_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'
import BoatReservation from '#models/boat_reservation'

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

  // --- fleet index ---

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
})
