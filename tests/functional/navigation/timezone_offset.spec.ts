import { BoatFactory } from '#database/factories/boat_factory'
import NavigationLog from '#models/navigation_log'
import BoatReservation from '#models/boat_reservation'
import { createAdminUser, createCharterAdminUser } from '#tests/functional/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

/**
 * #452 — a `datetime-local` field submits a naive wall-clock. Without the
 * browser offset the server stored it as if it were UTC, so every non-UTC user
 * saw their entry shifted by their offset (a 15:19 departure typed in UTC+10
 * came back as 01:19 the next day).
 */
test.group('Timezone offset on datetime-local submissions (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST navigation-logs stores the instant meant by a UTC+10 browser', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/navigation-logs`)
      .loginAs(user)
      .form({ departedAt: '2026-08-03T15:19', tzOffsetMinutes: -600 })
      .redirects(0)

    response.assertStatus(302)

    const log = await NavigationLog.query().where('boatId', boat.id).firstOrFail()
    assert.equal(log.departedAt.toUTC().toISO(), '2026-08-03T05:19:00.000Z')
    // Rendered back in the browser's zone, this is the 15:19 the user typed.
    assert.equal(log.departedAt.setZone('UTC+10').hour, 15)
  })

  test('closing a trip applies the offset to arrivedAt too', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client
      .post(`/boats/${boat.id}/navigation-logs`)
      .loginAs(user)
      .form({ departedAt: '2026-08-03T08:00', tzOffsetMinutes: -600 })
      .redirects(0)

    const log = await NavigationLog.query().where('boatId', boat.id).firstOrFail()

    const response = await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}/close`)
      .loginAs(user)
      .form({ arrivedAt: '2026-08-03T17:30', tzOffsetMinutes: -600 })
      .redirects(0)

    response.assertStatus(302)

    await log.refresh()
    assert.equal(log.arrivedAt!.toUTC().toISO(), '2026-08-03T07:30:00.000Z')
    assert.equal(log.status, 'completed')
  })

  test('a submission without tzOffsetMinutes keeps the naive-as-UTC behaviour', async ({
    client,
    assert,
  }) => {
    // Offline replays queued before this change, and API callers, must not be
    // silently shifted.
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client
      .post(`/boats/${boat.id}/navigation-logs`)
      .loginAs(user)
      .form({ departedAt: '2026-08-03T15:19' })
      .redirects(0)

    const log = await NavigationLog.query().where('boatId', boat.id).firstOrFail()
    assert.equal(log.departedAt.toUTC().toISO(), '2026-08-03T15:19:00.000Z')
  })

  test('POST reservations stores the instants meant by a UTC+10 browser', async ({
    client,
    assert,
  }) => {
    const user = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .loginAs(user)
      .form({
        startsAt: '2026-08-03T09:00',
        endsAt: '2026-08-03T18:00',
        clientName: 'Jean Voile',
        tzOffsetMinutes: -600,
      })
      .redirects(0)

    response.assertStatus(302)

    const reservation = await BoatReservation.query().where('boatId', boat.id).firstOrFail()
    assert.equal(reservation.startsAt.toUTC().toISO(), '2026-08-02T23:00:00.000Z')
    assert.equal(reservation.endsAt.toUTC().toISO(), '2026-08-03T08:00:00.000Z')
  })
})
