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
