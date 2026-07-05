import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser } from '#tests/functional/helpers'
import BoatPricing from '#models/boat_pricing'
import BoatReservation from '#models/boat_reservation'
import PricingSeason from '#models/pricing_season'
import { DateTime } from 'luxon'

const BASE_RESERVATION = {
  startsAt: '2026-07-01T10:00',
  endsAt: '2026-07-04T10:00', // 3 nights
  clientName: 'Alice Martin',
  clientEmail: 'alice@example.com',
  status: 'option',
}

test.group('Reservation pricing (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('store auto-fills total_price from base daily price when omitted', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatPricing.create({
      organizationId: user.organizationId!,
      boatId: boat.id,
      baseDailyPrice: '100.00',
      currency: 'EUR',
    })

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .form(BASE_RESERVATION)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    const reservation = await BoatReservation.query().where('boatId', boat.id).firstOrFail()
    assert.equal(Number(reservation.totalPrice), 300)
  })

  test('store keeps a user-provided total_price', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatPricing.create({
      organizationId: user.organizationId!,
      boatId: boat.id,
      baseDailyPrice: '100.00',
      currency: 'EUR',
    })

    await client
      .post(`/boats/${boat.id}/reservations`)
      .form({ ...BASE_RESERVATION, totalPrice: 999 })
      .loginAs(user)
      .redirects(0)

    const reservation = await BoatReservation.query().where('boatId', boat.id).firstOrFail()
    assert.equal(Number(reservation.totalPrice), 999)
  })

  test('auto-filled total reflects an applicable season', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatPricing.create({
      organizationId: user.organizationId!,
      boatId: boat.id,
      baseDailyPrice: '100.00',
      currency: 'EUR',
    })
    // Global season covering 07-02..07-31 at 200/night. Nights: 07-01 (base 100), 07-02, 07-03 (200 each).
    await PricingSeason.create({
      organizationId: user.organizationId!,
      boatId: null,
      name: 'Haute saison',
      startsOn: DateTime.fromISO('2026-07-02'),
      endsOn: DateTime.fromISO('2026-07-31'),
      dailyPrice: '200.00',
      priority: 1,
    })

    await client
      .post(`/boats/${boat.id}/reservations`)
      .form(BASE_RESERVATION)
      .loginAs(user)
      .redirects(0)

    const reservation = await BoatReservation.query().where('boatId', boat.id).firstOrFail()
    assert.equal(Number(reservation.totalPrice), 500)
  })

  test('store rejects a reservation shorter than min days', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatPricing.create({
      organizationId: user.organizationId!,
      boatId: boat.id,
      baseDailyPrice: '100.00',
      minDays: 5,
      currency: 'EUR',
    })

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .form(BASE_RESERVATION) // 3 nights < 5
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'The reservation duration is below the minimum allowed for this boat.'
    )
    const count = await BoatReservation.query().count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('store rejects a reservation longer than max days', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatPricing.create({
      organizationId: user.organizationId!,
      boatId: boat.id,
      baseDailyPrice: '100.00',
      maxDays: 2,
      currency: 'EUR',
    })

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .form(BASE_RESERVATION) // 3 nights > 2
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'The reservation duration exceeds the maximum allowed for this boat.'
    )
    const count = await BoatReservation.query().count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('index exposes boatPricing and pricingSeasons props', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatPricing.create({
      organizationId: user.organizationId!,
      boatId: boat.id,
      baseDailyPrice: '120.00',
      currency: 'EUR',
    })
    await PricingSeason.create({
      organizationId: user.organizationId!,
      boatId: null,
      name: 'Haute saison',
      startsOn: DateTime.fromISO('2026-07-01'),
      endsOn: DateTime.fromISO('2026-07-31'),
      multiplier: '1.500',
      priority: 1,
    })

    const response = await client.get(`/boats/${boat.id}/reservations`).loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as {
      boatPricing: { baseDailyPrice: number } | null
      pricingSeasons: Array<{ name: string }>
    }
    assert.isNotNull(props.boatPricing)
    assert.equal(props.boatPricing!.baseDailyPrice, 120)
    assert.lengthOf(props.pricingSeasons, 1)
    assert.equal(props.pricingSeasons[0].name, 'Haute saison')
  })

  test('boat without pricing leaves total_price null when omitted (no regression)', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client
      .post(`/boats/${boat.id}/reservations`)
      .form(BASE_RESERVATION)
      .loginAs(user)
      .redirects(0)

    const reservation = await BoatReservation.query().where('boatId', boat.id).firstOrFail()
    assert.isNull(reservation.totalPrice)
  })
})
