import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import BoatReservationService from '#services/boat_reservation_service'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'

test.group('BoatReservationService.listUpcomingForOrg (#832)', () => {
  test('returns departures and returns of the next 7 days, sorted by instant and capped', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const orgId = user.organizationId!
    const boat = await BoatFactory.merge({ organizationId: orgId }).create()
    const now = DateTime.now()

    const make = (startsAt: DateTime, endsAt: DateTime, over: Record<string, unknown> = {}) =>
      BoatReservationFactory.merge({
        boatId: boat.id,
        organizationId: orgId,
        status: 'confirmed',
        startsAt,
        endsAt,
        ...over,
      }).create()

    const departure = await make(now.plus({ days: 2 }), now.plus({ days: 9 }), {
      clientName: 'Départ J+2',
    })
    const ongoing = await make(now.minus({ days: 3 }), now.plus({ days: 1 }), {
      clientName: 'Retour J+1',
    })
    await make(now.plus({ days: 12 }), now.plus({ days: 15 })) // trop loin
    await make(now.minus({ days: 10 }), now.minus({ days: 2 })) // terminée
    await make(now.plus({ days: 1 }), now.plus({ days: 3 }), { status: 'cancelled' })
    // Autre organisation
    const other = await UserFactory.with('organization').create()
    const otherBoat = await BoatFactory.merge({ organizationId: other.organizationId! }).create()
    await BoatReservationFactory.merge({
      boatId: otherBoat.id,
      organizationId: other.organizationId!,
      status: 'confirmed',
      startsAt: now.plus({ days: 1 }),
      endsAt: now.plus({ days: 2 }),
    }).create()

    const svc = await app.container.make(BoatReservationService)
    const items = await svc.listUpcomingForOrg(user, now)

    assert.deepEqual(
      items.map((i) => [i.id, i.event]),
      [
        [ongoing.id, 'return'],
        [departure.id, 'departure'],
      ]
    )
    assert.equal(items[0]!.at, ongoing.endsAt.toISO())
    assert.equal(items[1]!.at, departure.startsAt.toISO())
    assert.equal(items[1]!.boatName, boat.name)

    const capped = await svc.listUpcomingForOrg(user, now, 7, 1)
    assert.equal(capped.length, 1)
    assert.equal(capped[0]!.id, ongoing.id)
  })
})

test.group('BoatReservationService.getOccupancyForOrg (widget « Occupation location »)', () => {
  test('rates confirmed boat-days clipped to the 30-day window and sums the revenue of departures', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const orgId = user.organizationId!
    const boat = await BoatFactory.merge({ organizationId: orgId }).create()
    const now = DateTime.now()

    const make = (
      startsAt: DateTime,
      endsAt: DateTime,
      status: 'option' | 'confirmed' | 'cancelled',
      totalPrice: string | null
    ) =>
      BoatReservationFactory.merge({
        boatId: boat.id,
        organizationId: orgId,
        status,
        startsAt,
        endsAt,
        totalPrice,
      }).create()

    // 10 jours entièrement dans la fenêtre, départ à venir → CA compté.
    await make(now.plus({ days: 2 }), now.plus({ days: 12 }), 'confirmed', '1000.00')
    // En cours : 5 jours restants, départ passé → CA non compté.
    await make(now.minus({ days: 5 }), now.plus({ days: 5 }), 'confirmed', '500.00')
    // Déborde de l'horizon : 5 jours comptés, CA compté (départ dans la fenêtre).
    await make(now.plus({ days: 25 }), now.plus({ days: 40 }), 'confirmed', '2000.00')
    // Option : comptée, hors taux et hors CA.
    await make(now.plus({ days: 1 }), now.plus({ days: 3 }), 'option', '300.00')
    // Hors fenêtre et annulée : ignorées.
    await make(now.plus({ days: 40 }), now.plus({ days: 45 }), 'confirmed', '9999.00')
    await make(now.plus({ days: 1 }), now.plus({ days: 3 }), 'cancelled', '9999.00')
    // Autre organisation.
    const other = await UserFactory.with('organization').create()
    const otherBoat = await BoatFactory.merge({ organizationId: other.organizationId! }).create()
    await BoatReservationFactory.merge({
      boatId: otherBoat.id,
      organizationId: other.organizationId!,
      status: 'confirmed',
      startsAt: now.plus({ days: 1 }),
      endsAt: now.plus({ days: 20 }),
    }).create()

    const svc = await app.container.make(BoatReservationService)
    const summary = await svc.getOccupancyForOrg(user, 2, now)

    assert.equal(summary.windowDays, 30)
    assert.equal(summary.boats, 2)
    assert.equal(summary.reservedBoatDays, 20)
    // 20 jours-bateau sur 2 × 30 = 33 %.
    assert.equal(summary.occupancyRate, 33)
    assert.equal(summary.confirmed, 3)
    assert.equal(summary.options, 1)
    assert.equal(summary.confirmedRevenue, 3000)

    const noBoat = await svc.getOccupancyForOrg(user, 0, now)
    assert.equal(noBoat.occupancyRate, 0)
    assert.equal(noBoat.confirmed, 0)
  })
})
