import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/utils/db'
import AuditLog from '#models/audit_log'
import BoatPricing from '#models/boat_pricing'
import BoatReservation from '#models/boat_reservation'
import Notification from '#models/notification'
import NotificationScanService from '#services/notification_scan_service'
import NotificationService from '#services/notification_service'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { createAdminUser, createCharterAdminUser } from '#tests/functional/helpers'
import type Boat from '#models/boat'
import type User from '#models/user'
import type { ApiClient } from '@japa/api-client'

/** Créneau `datetime-local` dans `days` jours, sur `nights` nuits. */
function slot(days: number, nights = 3) {
  const start = DateTime.now().plus({ days }).set({ hour: 10, minute: 0 })
  return {
    startsAt: start.toFormat("yyyy-LL-dd'T'HH:mm"),
    endsAt: start.plus({ days: nights }).toFormat("yyyy-LL-dd'T'HH:mm"),
    tzOffsetMinutes: '0',
    clientName: 'Alice Martin',
  }
}

async function charterBoat(user: User, securityDeposit: string | null = '1500.00') {
  const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
  await BoatPricing.create({
    organizationId: user.organizationId!,
    boatId: boat.id,
    baseDailyPrice: '100.00',
    depositAmount: securityDeposit,
    currency: 'EUR',
  })
  return boat
}

/** Réservation confirmée à 1 000 € avec 300 € d'acompte attendu, départ dans `days` jours. */
async function confirmedReservation(boat: Boat, days = 30, overrides = {}) {
  const startsAt = DateTime.now().plus({ days })
  return await BoatReservationFactory.merge({
    boatId: boat.id,
    organizationId: boat.organizationId,
    status: 'confirmed',
    startsAt,
    endsAt: startsAt.plus({ days: 3 }),
    totalPrice: '1000.00',
    depositAmount: '300.00',
    securityDepositAmount: '1500.00',
    ...overrides,
  }).create()
}

function pay(client: ApiClient, user: User, r: BoatReservation, form: Record<string, unknown>) {
  return client
    .patch(`/boats/${r.boatId}/reservations/${r.id}/payment`)
    .form(form)
    .loginAs(user)
    .redirects(0)
}

function deposit(client: ApiClient, user: User, r: BoatReservation, form: Record<string, unknown>) {
  return client
    .patch(`/boats/${r.boatId}/reservations/${r.id}/security-deposit`)
    .form(form)
    .loginAs(user)
    .redirects(0)
}

async function auditOf(organizationId: number, action: string) {
  return await AuditLog.query().where('organizationId', organizationId).where('action', action)
}

test.group('Reservation payment — defaults at confirmation (#875)', (group) => {
  group.each.setup(() => truncateDb())

  test('a confirmed booking expects 30 % deposit and copies the boat security deposit', async ({
    client,
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const boat = await charterBoat(admin)

    await client
      .post(`/boats/${boat.id}/reservations`)
      .form({ ...slot(20), status: 'confirmed', totalPrice: '1000' })
      .loginAs(admin)
      .redirects(0)

    const reservation = await BoatReservation.query().where('boatId', boat.id).firstOrFail()
    assert.equal(reservation.depositAmount, '300.00')
    assert.equal(reservation.securityDepositAmount, '1500.00')
    assert.equal(reservation.paymentStatus, 'unpaid')
    assert.equal(reservation.securityDepositStatus, 'none')
    assert.equal(reservation.paidAmount, '0.00')
  })

  test('an option expects nothing until it is confirmed', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const boat = await charterBoat(admin)

    await client
      .post(`/boats/${boat.id}/reservations`)
      .form({ ...slot(20), status: 'option', totalPrice: '800' })
      .loginAs(admin)
      .redirects(0)
    const reservation = await BoatReservation.query().where('boatId', boat.id).firstOrFail()
    assert.isNull(reservation.depositAmount)
    assert.isNull(reservation.securityDepositAmount)

    await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
      .form({ status: 'confirmed' })
      .loginAs(admin)
      .redirects(0)
    await reservation.refresh()
    assert.equal(reservation.depositAmount, '240.00')
    assert.equal(reservation.securityDepositAmount, '1500.00')
  })
})

test.group('Reservation payment — deposit, balance, refund (#875)', (group) => {
  group.each.setup(() => truncateDb())

  test('deposit then balance: amounts, dates, method, status and audit', async ({
    client,
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const boat = await charterBoat(admin)
    const reservation = await confirmedReservation(boat)

    const first = await pay(client, admin, reservation, { kind: 'deposit', method: 'transfer' })
    first.assertStatus(302)
    await reservation.refresh()
    assert.equal(reservation.paymentStatus, 'deposit_paid')
    assert.equal(reservation.paidAmount, '300.00')
    assert.equal(reservation.paymentMethod, 'transfer')
    assert.isNotNull(reservation.depositPaidAt)
    assert.isNull(reservation.balancePaidAt)

    await pay(client, admin, reservation, { kind: 'balance', method: 'card' })
    await reservation.refresh()
    assert.equal(reservation.paymentStatus, 'paid')
    assert.equal(reservation.paidAmount, '1000.00')
    assert.equal(reservation.paymentMethod, 'card')
    assert.isNotNull(reservation.balancePaidAt)

    const logs = await auditOf(admin.organizationId!, 'reservation.payment_recorded')
    assert.deepEqual(
      logs.map((l) => l.metadata).sort((a, b) => String(a?.kind).localeCompare(String(b?.kind))),
      [
        { kind: 'balance', amount: '700.00', method: 'card', paymentStatus: 'paid' },
        { kind: 'deposit', amount: '300.00', method: 'transfer', paymentStatus: 'deposit_paid' },
      ]
    )
  })

  test('a deposit amount entered at reception replaces the expected one', async ({
    client,
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const boat = await charterBoat(admin)
    const reservation = await confirmedReservation(boat)

    await pay(client, admin, reservation, { kind: 'deposit', method: 'cash', amount: 450 })
    await reservation.refresh()
    assert.equal(reservation.depositAmount, '450.00')
    assert.equal(reservation.paidAmount, '450.00')
  })

  test('refused gestures flash an error and write nothing', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const boat = await charterBoat(admin)
    const paid = await confirmedReservation(boat, 30, {
      paymentStatus: 'paid',
      paidAmount: '1000.00',
    })
    const noPrice = await confirmedReservation(boat, 60, { totalPrice: null, depositAmount: null })
    const tooBig = await confirmedReservation(boat, 90)

    for (const [reservation, form] of [
      [paid, { kind: 'deposit' }],
      [noPrice, { kind: 'balance' }],
      [tooBig, { kind: 'deposit', amount: 5000 }],
      [tooBig, { kind: 'refund' }],
    ] as const) {
      const response = await pay(client, admin, reservation, form)
      response.assertStatus(302)
      response.assertFlashMessage('error')
    }

    await Promise.all([paid.refresh(), noPrice.refresh(), tooBig.refresh()])
    assert.equal(paid.paidAmount, '1000.00')
    assert.equal(noPrice.paymentStatus, 'unpaid')
    assert.equal(tooBig.paymentStatus, 'unpaid')
    assert.lengthOf(await auditOf(admin.organizationId!, 'reservation.payment_recorded'), 0)
  })

  test('a cancelled booking can only be refunded', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const boat = await charterBoat(admin)
    const reservation = await confirmedReservation(boat, 30, {
      status: 'cancelled',
      paymentStatus: 'deposit_paid',
      paidAmount: '300.00',
    })

    const refused = await pay(client, admin, reservation, { kind: 'balance' })
    refused.assertFlashMessage('error')

    await pay(client, admin, reservation, { kind: 'refund', method: 'transfer' })
    await reservation.refresh()
    assert.equal(reservation.paymentStatus, 'refunded')
  })

  test('raising the price of a paid booking brings the balance back', async ({
    client,
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const boat = await charterBoat(admin)
    const reservation = await confirmedReservation(boat, 30, {
      paymentStatus: 'paid',
      paidAmount: '1000.00',
    })

    await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
      .form({ totalPrice: '1200' })
      .loginAs(admin)
      .redirects(0)
    await reservation.refresh()
    assert.equal(reservation.paymentStatus, 'deposit_paid')
  })

  test('another organization cannot record a payment', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const outsider = await createCharterAdminUser()
    const boat = await charterBoat(admin)
    const reservation = await confirmedReservation(boat)

    const response = await pay(client, outsider, reservation, { kind: 'deposit' })
    response.assertStatus(302)
    response.assertHeader('location', '/boats')
    await reservation.refresh()
    assert.equal(reservation.paymentStatus, 'unpaid')
  })
})

test.group('Reservation payment — security deposit (#875)', (group) => {
  group.each.setup(() => truncateDb())

  test('held, then retained with an amount and a reason', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const boat = await charterBoat(admin)
    const reservation = await confirmedReservation(boat)

    await deposit(client, admin, reservation, { action: 'hold' })
    await reservation.refresh()
    assert.equal(reservation.securityDepositStatus, 'held')
    assert.equal(reservation.securityDepositAmount, '1500.00')

    const tooMuch = await deposit(client, admin, reservation, {
      action: 'retain',
      amount: 2000,
      note: 'Hélice',
    })
    tooMuch.assertFlashMessage('error')
    const noReason = await deposit(client, admin, reservation, { action: 'retain', amount: 200 })
    noReason.assertFlashMessage('error')

    await deposit(client, admin, reservation, {
      action: 'retain',
      amount: 200,
      note: 'Hélice tordue au retour',
    })
    await reservation.refresh()
    assert.equal(reservation.securityDepositStatus, 'retained')
    assert.equal(reservation.securityDepositRetainedAmount, '200.00')
    assert.equal(reservation.securityDepositNote, 'Hélice tordue au retour')

    const [held] = await auditOf(admin.organizationId!, 'reservation.security_deposit_held')
    assert.equal(held.entityId, reservation.id)
    const [retained] = await auditOf(admin.organizationId!, 'reservation.security_deposit_retained')
    assert.deepEqual(retained.metadata, {
      amount: '1500.00',
      retainedAmount: '200.00',
      note: 'Hélice tordue au retour',
    })
  })

  test('released only once held', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const boat = await charterBoat(admin)
    const reservation = await confirmedReservation(boat)

    const early = await deposit(client, admin, reservation, { action: 'release' })
    early.assertFlashMessage('error')

    await deposit(client, admin, reservation, { action: 'hold', amount: 800 })
    await deposit(client, admin, reservation, { action: 'release' })
    await reservation.refresh()
    assert.equal(reservation.securityDepositStatus, 'released')
    assert.equal(reservation.securityDepositAmount, '800.00')
  })

  test('without a deposit on the pricing, holding requires an amount', async ({
    client,
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const boat = await charterBoat(admin, null)
    const reservation = await confirmedReservation(boat, 30, { securityDepositAmount: null })

    const response = await deposit(client, admin, reservation, { action: 'hold' })
    response.assertFlashMessage('error')
    await reservation.refresh()
    assert.equal(reservation.securityDepositStatus, 'none')
  })
})

test.group('Reservation payment — reminders (#875)', (group) => {
  group.each.setup(() => truncateDb())

  test('the daily scan flags awaited deposits and balances due within 7 days', async ({
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const boat = await charterBoat(admin)
    await confirmedReservation(boat, 30)
    await confirmedReservation(boat, 3, { paymentStatus: 'deposit_paid', paidAmount: '300.00' })
    // Soldée : rien à réclamer. Option : rien non plus.
    await confirmedReservation(boat, 60, { paymentStatus: 'paid', paidAmount: '1000.00' })
    await confirmedReservation(boat, 90, { status: 'option' })

    await new NotificationScanService(new NotificationService()).run()

    const notifications = await Notification.query().where('userId', admin.id)
    const byType = new Map(notifications.map((n) => [n.type, n]))
    assert.equal(byType.get('reservation.deposit_due')?.metadata?.count, 1)
    assert.equal(byType.get('reservation.balance_due')?.metadata?.count, 1)
    assert.equal(byType.get('reservation.balance_due')?.actionUrl, `/boats/${boat.id}/reservations`)

    // Anti-doublon : un second scan le même jour ne renotifie pas.
    const { created } = await new NotificationScanService(new NotificationService()).run()
    assert.equal(created, 0)
  })

  test('an organization without the Charter module gets no payment reminder', async ({
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await charterBoat(admin)
    await confirmedReservation(boat, 3)

    await new NotificationScanService(new NotificationService()).run()

    const notifications = await Notification.query()
      .where('userId', admin.id)
      .whereIn('type', ['reservation.deposit_due', 'reservation.balance_due'])
    assert.lengthOf(notifications, 0)
  })
})
