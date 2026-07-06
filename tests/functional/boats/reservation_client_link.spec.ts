import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { BoatFactory } from '#database/factories/boat_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'
import OrganizationMembership from '#models/organization_membership'
import BoatReservation from '#models/boat_reservation'
import Client from '#models/client'

const PERIOD = { startsAt: '2026-09-01T10:00', endsAt: '2026-09-08T10:00' }

async function createEnterpriseAdminUser() {
  const user = await UserFactory.with('organization', 1, (org) =>
    org.merge({ plan: 'enterprise' })
  ).create()
  if (user.organizationId) {
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: user.organizationId,
      role: 'admin',
    })
  }
  return user
}

async function makeClient(organizationId: number, status: 'active' | 'blacklisted' = 'active') {
  return Client.create({
    organizationId,
    firstName: 'Alice',
    lastName: 'Martin',
    email: 'alice@example.com',
    status,
  })
}

test.group('Reservation ↔ client link (#275)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('links a reservation to a client on create', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const c = await makeClient(user.organizationId!)

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .loginAs(user)
      .form({ ...PERIOD, clientId: c.id, clientName: 'Alice Martin', status: 'option' })
      .redirects(0)

    response.assertStatus(302)
    const reservation = await BoatReservation.query().where('boatId', boat.id).firstOrFail()
    assert.equal(reservation.clientId, c.id)
  })

  test('refuses to create a reservation for a blacklisted client', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const c = await makeClient(user.organizationId!, 'blacklisted')

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .loginAs(user)
      .form({ ...PERIOD, clientId: c.id, clientName: 'Alice Martin', status: 'option' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'This client is blacklisted: booking not allowed.')
    assert.lengthOf(await BoatReservation.all(), 0)
  })

  test('refuses to update a reservation onto a blacklisted client', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const blacklisted = await makeClient(user.organizationId!, 'blacklisted')
    const reservation = await BoatReservation.create({
      boatId: boat.id,
      organizationId: user.organizationId!,
      status: 'option',
      startsAt: DateTime.fromISO('2026-09-01T10:00'),
      endsAt: DateTime.fromISO('2026-09-08T10:00'),
      clientName: 'Walk-in',
    })

    const response = await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
      .loginAs(user)
      .form({ clientId: blacklisted.id, clientName: 'Walk-in', status: 'option' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'This client is blacklisted: booking not allowed.')
    await reservation.refresh()
    assert.isNull(reservation.clientId)
  })

  test('ignores a client id from another organization', async ({ client, assert }) => {
    const user = await createAdminUser()
    const other = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const foreignClient = await makeClient(other.organizationId!)

    await client
      .post(`/boats/${boat.id}/reservations`)
      .loginAs(user)
      .form({ ...PERIOD, clientId: foreignClient.id, clientName: 'Alice Martin', status: 'option' })
      .redirects(0)

    const reservation = await BoatReservation.query().where('boatId', boat.id).firstOrFail()
    assert.isNull(reservation.clientId)
  })

  test('deleting a client nulls the reservation link but keeps the snapshot', async ({
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const c = await makeClient(user.organizationId!)
    const reservation = await BoatReservation.create({
      boatId: boat.id,
      organizationId: user.organizationId!,
      clientId: c.id,
      status: 'option',
      startsAt: DateTime.fromISO('2026-09-01T10:00'),
      endsAt: DateTime.fromISO('2026-09-08T10:00'),
      clientName: 'Alice Martin',
    })

    await c.delete()
    await reservation.refresh()

    assert.isNull(reservation.clientId)
    assert.equal(reservation.clientName, 'Alice Martin')
  })

  test('client detail page lists the reservation history', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const c = await makeClient(user.organizationId!)
    await BoatReservation.create({
      boatId: boat.id,
      organizationId: user.organizationId!,
      clientId: c.id,
      status: 'confirmed',
      startsAt: DateTime.fromISO('2026-09-01T10:00'),
      endsAt: DateTime.fromISO('2026-09-08T10:00'),
      clientName: 'Alice Martin',
    })

    const response = await client.get(`/clients/${c.id}`).loginAs(user).withInertia()
    response.assertInertiaComponent('clients/show')
    const props = response.inertiaProps as {
      client: { id: number }
      reservations: Array<{ boatId: number }>
    }
    assert.equal(props.client.id, c.id)
    assert.lengthOf(props.reservations, 1)
    assert.equal(props.reservations[0].boatId, boat.id)
  })
})
