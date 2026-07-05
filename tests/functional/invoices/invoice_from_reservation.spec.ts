import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { BoatFactory } from '#database/factories/boat_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'
import OrganizationMembership from '#models/organization_membership'
import BoatReservation from '#models/boat_reservation'
import Client from '#models/client'
import Invoice from '#models/invoice'

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

async function createReservation(
  organizationId: number,
  opts: { clientEmail?: string | null; clientName?: string; totalPrice?: string | null } = {}
) {
  const boat = await BoatFactory.merge({ organizationId }).create()
  return BoatReservation.create({
    boatId: boat.id,
    organizationId,
    status: 'confirmed',
    startsAt: DateTime.fromISO('2026-08-01T10:00:00'),
    endsAt: DateTime.fromISO('2026-08-08T10:00:00'),
    clientName: opts.clientName ?? 'Reservation Client',
    clientEmail: opts.clientEmail ?? null,
    clientPhone: null,
    notes: null,
    totalPrice: opts.totalPrice ?? null,
  })
}

test.group('Invoice from reservation (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('creates a draft quote pre-filled from the reservation', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const reservation = await createReservation(user.organizationId!, {
      clientEmail: 'no-match@example.com',
      clientName: 'Free Text Client',
      totalPrice: '500.00',
    })

    const response = await client
      .post(`/invoices/from-reservation/${reservation.id}`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Quote created from the reservation.')

    const quote = await Invoice.query()
      .where('kind', 'quote')
      .where('reservationId', reservation.id)
      .preload('lines')
      .firstOrFail()

    assert.match(quote.number, /^DEV-\d{6}$/)
    assert.equal(quote.status, 'draft')
    assert.equal(quote.reservationId, reservation.id)
    assert.lengthOf(quote.lines, 1)
    assert.equal(Number.parseFloat(quote.lines[0].unitPrice), 500)
    assert.equal(Number.parseFloat(quote.total), 500)
    response.assertHeader('location', `/invoices/${quote.id}`)
  })

  test('resolves the client by the reservation email snapshot', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const c = await Client.create({
      organizationId: user.organizationId!,
      firstName: 'Alice',
      lastName: 'Martin',
      email: 'alice@example.com',
      status: 'active',
    })
    const reservation = await createReservation(user.organizationId!, {
      clientEmail: 'alice@example.com',
      clientName: 'Snapshot Name',
      totalPrice: '250.00',
    })

    await client.post(`/invoices/from-reservation/${reservation.id}`).loginAs(user).redirects(0)

    const quote = await Invoice.query().where('reservationId', reservation.id).firstOrFail()
    assert.equal(quote.clientId, c.id)
    assert.equal(quote.clientName, c.fullName)
  })

  test('keeps the free-text name when no client matches', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const reservation = await createReservation(user.organizationId!, {
      clientEmail: null,
      clientName: 'Walk-in Guest',
      totalPrice: null,
    })

    await client.post(`/invoices/from-reservation/${reservation.id}`).loginAs(user).redirects(0)

    const quote = await Invoice.query()
      .where('reservationId', reservation.id)
      .preload('lines')
      .firstOrFail()
    assert.isNull(quote.clientId)
    assert.equal(quote.clientName, 'Walk-in Guest')
    // No total on the reservation → a zero-priced line.
    assert.equal(Number.parseFloat(quote.lines[0].unitPrice), 0)
  })

  test('is org-scoped (IDOR)', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const other = await createEnterpriseAdminUser()
    const foreign = await createReservation(other.organizationId!, { totalPrice: '100.00' })

    const response = await client
      .post(`/invoices/from-reservation/${foreign.id}`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/reservations')
    assert.lengthOf(await Invoice.query().where('reservationId', foreign.id), 0)
  })

  test('is blocked for non-enterprise plans', async ({ client, assert }) => {
    const user = await createAdminUser() // pro
    const reservation = await createReservation(user.organizationId!, { totalPrice: '100.00' })

    const response = await client
      .post(`/invoices/from-reservation/${reservation.id}`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')
    assert.lengthOf(await Invoice.query().where('reservationId', reservation.id), 0)
  })

  test('the reservations list exposes the linked document and the enterprise flag', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const reservation = await createReservation(user.organizationId!, { totalPrice: '100.00' })

    await client.post(`/invoices/from-reservation/${reservation.id}`).loginAs(user).redirects(0)
    const quote = await Invoice.query().where('reservationId', reservation.id).firstOrFail()

    const response = await client.get('/reservations').loginAs(user).withInertia()
    response.assertInertiaComponent('reservations/index')
    const props = response.inertiaProps as {
      canCreateQuote: boolean
      reservations: Array<{ id: number; linkedInvoices: Array<{ id: number; number: string }> }>
    }
    assert.isTrue(props.canCreateQuote)
    const row = props.reservations.find((r) => r.id === reservation.id)
    assert.exists(row)
    assert.deepInclude(row!.linkedInvoices, { id: quote.id, number: quote.number })
  })

  test('non-enterprise reservations list hides the create-quote flag', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser() // pro
    await createReservation(user.organizationId!, { totalPrice: '100.00' })

    const response = await client.get('/reservations').loginAs(user).withInertia()
    const props = response.inertiaProps as { canCreateQuote: boolean }
    assert.isFalse(props.canCreateQuote)
  })
})
