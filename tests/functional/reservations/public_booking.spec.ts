import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/utils/db'
import BoatPricing from '#models/boat_pricing'
import BoatReservation from '#models/boat_reservation'
import ExternalCalendar from '#models/external_calendar'
import ExternalCalendarEvent from '#models/external_calendar_event'
import Notification from '#models/notification'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { BoatMaintenanceTaskFactory } from '#database/factories/boat_maintenance_task_factory'
import PublicBookingService from '#services/public_booking_service'
import { assertPageContract } from '#tests/support/inertia_page'
import {
  createAdminUser,
  createCharterAdminUser,
  createMechanicUser,
} from '#tests/functional/helpers'
import type Boat from '#models/boat'
import type User from '#models/user'
import type Organization from '#models/organization'
import type { PublicBookingQuote, PublicBusyRange } from '#shared/types/public_booking'

/**
 * Page publique de réservation (#881) : le client final voit les
 * disponibilités d'un bateau, obtient un devis et envoie une demande qui
 * devient une option à confirmer par le loueur.
 */

/** Jour `YYYY-MM-DD` dans `days` jours, à l'heure de Paris. */
function dayIn(days: number): string {
  return DateTime.now().setZone('Europe/Paris').plus({ days }).toISODate()!
}

/** Minuit à Paris le jour `dayIn(days)`. */
function parisMidnight(days: number): DateTime {
  return DateTime.fromISO(dayIn(days), { zone: 'Europe/Paris' })
}

async function charterFleet(): Promise<{ user: User; org: Organization; boat: Boat }> {
  const user = await createCharterAdminUser()
  user.locale = 'fr'
  await user.save()
  await user.load('organization')
  const boat = await BoatFactory.merge({
    organizationId: user.organizationId!,
    name: 'Ondine',
    publicBookingEnabled: true,
    publicBookingSlug: 'ondine',
  }).create()
  await BoatPricing.create({
    organizationId: user.organizationId!,
    boatId: boat.id,
    baseDailyPrice: '200',
    baseWeeklyPrice: null,
    depositAmount: '1500',
    minDays: 2,
    maxDays: null,
    currency: 'EUR',
  })
  return { user, org: user.organization!, boat }
}

function pagePath(org: Organization, boat: Boat): string {
  return `/book/${org.slug}/${boat.publicBookingSlug}`
}

const REQUEST = {
  name: 'Claire Dubois',
  email: 'claire@example.com',
  phone: '06 12 34 56 78',
  message: 'Nous serons 4 à bord.',
  consent: true,
  locale: 'fr',
}

test.group('Public booking — page (#881)', (group) => {
  group.each.setup(() => truncateDb())

  test('an open boat renders its page, without any personal data', async ({ client, assert }) => {
    const { org, boat } = await charterFleet()
    await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'confirmed',
      startsAt: parisMidnight(10),
      endsAt: parisMidnight(13),
      clientName: 'Alice Secret',
      clientEmail: 'alice@secret.test',
    }).create()

    const response = await client.get(pagePath(org, boat)).withInertia()

    assertPageContract(assert, response, 'book/show')
    response.assertHeader('x-robots-tag', 'noindex')
    const props = response.inertiaProps as { busy: PublicBusyRange[]; quote: unknown }
    assert.deepEqual(props.busy, [{ startsOn: dayIn(10), endsOn: dayIn(13) }])
    assert.isNull(props.quote)
    assert.notInclude(response.text(), 'Alice Secret')
    assert.notInclude(response.text(), 'alice@secret.test')
  })

  test('busy days merge bookings, imported calendars and planned maintenance', async ({
    client,
    assert,
  }) => {
    const { org, boat } = await charterFleet()
    await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'option',
      startsAt: parisMidnight(5),
      endsAt: parisMidnight(7),
    }).create()
    // Une réservation annulée ne tient plus rien.
    await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'cancelled',
      startsAt: parisMidnight(20),
      endsAt: parisMidnight(22),
    }).create()
    const external = await ExternalCalendar.create({
      organizationId: boat.organizationId,
      boatId: boat.id,
      name: 'Samboat',
      url: 'https://www.samboat.fr/ical/x.ics',
    })
    await ExternalCalendarEvent.create({
      externalCalendarId: external.id,
      boatId: boat.id,
      uid: 'samboat-1',
      summary: 'Reserved',
      startsAt: parisMidnight(7),
      endsAt: parisMidnight(9),
    })
    await BoatMaintenanceTaskFactory.merge({
      boatId: boat.id,
      title: 'Carénage',
      status: 'open',
      dueAt: DateTime.fromISO(dayIn(30)),
    }).create()

    const response = await client.get(pagePath(org, boat)).withInertia()
    const busy = (response.inertiaProps as { busy: PublicBusyRange[] }).busy

    // Option et créneau importé se touchent : une seule plage.
    assert.deepEqual(busy[0], { startsOn: dayIn(5), endsOn: dayIn(9) })
    assert.isTrue(busy.some((range) => range.startsOn <= dayIn(30) && dayIn(30) < range.endsOn))
    assert.isFalse(busy.some((range) => range.startsOn <= dayIn(20) && dayIn(20) < range.endsOn))
    // Les props de la page — pas les traductions partagées, qui citent Samboat.
    const pageProps = JSON.stringify({
      busy,
      boat: (response.inertiaProps as { boat: unknown }).boat,
    })
    assert.notInclude(pageProps, 'Carénage')
    assert.notInclude(pageProps, 'Samboat')
  })

  test('the dates in the query string come back as a server-side quote', async ({
    client,
    assert,
  }) => {
    const { org, boat } = await charterFleet()

    const response = await client
      .get(`${pagePath(org, boat)}?startsOn=${dayIn(10)}&endsOn=${dayIn(13)}`)
      .withInertia()

    const quote = (response.inertiaProps as { quote: PublicBookingQuote }).quote
    assert.equal(quote.state, 'ok')
    assert.equal(quote.quote?.nights, 3)
    assert.equal(quote.quote?.total, 600)
  })

  test('a quote over a busy day is flagged unavailable, a past one invalid', async ({
    client,
    assert,
  }) => {
    const { org, boat } = await charterFleet()
    await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'confirmed',
      startsAt: parisMidnight(11),
      endsAt: parisMidnight(12),
    }).create()

    const busy = await client
      .get(`${pagePath(org, boat)}?startsOn=${dayIn(10)}&endsOn=${dayIn(13)}`)
      .withInertia()
    const past = await client
      .get(`${pagePath(org, boat)}?startsOn=${dayIn(-3)}&endsOn=${dayIn(-1)}`)
      .withInertia()

    const busyQuote = (busy.inertiaProps as { quote: PublicBookingQuote }).quote
    assert.equal(busyQuote.state, 'unavailable')
    assert.isNull(busyQuote.quote)
    assert.equal((past.inertiaProps as { quote: PublicBookingQuote }).quote.state, 'invalid')
  })

  test('a closed boat, an unknown organization or one without the module answer 404', async ({
    client,
  }) => {
    const { org, boat } = await charterFleet()
    const closed = await BoatFactory.merge({
      organizationId: boat.organizationId,
      name: 'Fermé',
      publicBookingEnabled: false,
      publicBookingSlug: 'ferme',
    }).create()
    const plain = await createAdminUser()
    await plain.load('organization')
    const noModule = await BoatFactory.merge({
      organizationId: plain.organizationId!,
      publicBookingEnabled: true,
      publicBookingSlug: 'libre',
    }).create()

    const paths = [
      `/book/${org.slug}/${closed.publicBookingSlug}`,
      `/book/unknown-org/${boat.publicBookingSlug}`,
      `/book/${plain.organization!.slug}/${noModule.publicBookingSlug}`,
      `/book/${plain.organization!.slug}`,
    ]
    for (const path of paths) {
      const response = await client.get(path)
      response.assertStatus(404)
    }
  })

  test('the fleet page lists only the open boats', async ({ client, assert }) => {
    const { org, boat } = await charterFleet()
    await BoatFactory.merge({ organizationId: boat.organizationId, name: 'Privé' }).create()

    const response = await client.get(`/book/${org.slug}`).withInertia()

    assertPageContract(assert, response, 'book/fleet')
    const boats = (response.inertiaProps as { boats: { slug: string; name: string }[] }).boats
    assert.deepEqual(
      boats.map((b) => b.name),
      ['Ondine']
    )
    assert.equal(boats[0].slug, 'ondine')
  })
})

test.group('Public booking — request (#881)', (group) => {
  group.each.setup(() => truncateDb())
  group.each.setup(() => {
    mail.fake()
  })
  group.each.teardown(() => mail.restore())

  test('a request becomes a public option, notifies the admins and acknowledges the client', async ({
    client,
    assert,
  }) => {
    const { messages } = mail.fake()
    const { user, org, boat } = await charterFleet()

    const response = await client
      .post(`${pagePath(org, boat)}/request`)
      .header('referer', pagePath(org, boat))
      .form({ ...REQUEST, startsOn: dayIn(10), endsOn: dayIn(13) })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('publicBookingSubmitted', true)

    const reservation = await BoatReservation.query().where('boatId', boat.id).firstOrFail()
    assert.equal(reservation.status, 'option')
    assert.equal(reservation.source, 'public')
    assert.equal(reservation.requestLocale, 'fr')
    assert.equal(reservation.clientName, 'Claire Dubois')
    assert.equal(reservation.clientEmail, 'claire@example.com')
    assert.equal(reservation.notes, 'Nous serons 4 à bord.')
    assert.equal(Number(reservation.totalPrice), 600)
    assert.equal(reservation.startsAt.setZone('Europe/Paris').toISODate(), dayIn(10))
    assert.equal(reservation.endsAt.setZone('Europe/Paris').toISODate(), dayIn(13))

    const notification = await Notification.query()
      .where('userId', user.id)
      .where('type', 'reservation.requested')
      .firstOrFail()
    assert.equal(notification.actionUrl, `/boats/${boat.id}/reservations`)
    assert.include(notification.title, 'Ondine')

    messages.assertSent((message) => message.hasTo(user.email))
    messages.assertSent((message) => message.hasTo('claire@example.com'))
    const ack = messages
      .sent()
      .map((message) => message.toObject().message as { to?: unknown; subject?: string })
      .find((message) => message.subject?.startsWith('Votre demande de réservation'))
    assert.exists(ack)
  })

  test('the page shows the confirmation after the redirect', async ({ client, assert }) => {
    const { org, boat } = await charterFleet()

    const response = await client
      .post(`${pagePath(org, boat)}/request`)
      .header('referer', pagePath(org, boat))
      .form({ ...REQUEST, startsOn: dayIn(10), endsOn: dayIn(13) })
      .withInertia()

    assert.isTrue((response.inertiaProps as { submitted: boolean }).submitted)
  })

  test('a request over busy dates is refused and nothing is written', async ({
    client,
    assert,
  }) => {
    const { org, boat } = await charterFleet()
    await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'confirmed',
      startsAt: parisMidnight(11),
      endsAt: parisMidnight(12),
    }).create()

    const response = await client
      .post(`${pagePath(org, boat)}/request`)
      .form({ ...REQUEST, startsOn: dayIn(10), endsOn: dayIn(13) })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'These dates are no longer available. Pick others in the calendar.'
    )
    assert.lengthOf(await BoatReservation.query().where('source', 'public'), 0)
  })

  test('a stay shorter than the minimum rental is refused', async ({ client, assert }) => {
    const { org, boat } = await charterFleet()

    const response = await client
      .post(`${pagePath(org, boat)}/request`)
      .form({ ...REQUEST, startsOn: dayIn(10), endsOn: dayIn(11) })
      .redirects(0)

    response.assertFlashMessage('error', "This is shorter than the boat's minimum rental.")
    assert.lengthOf(await BoatReservation.all(), 0)
  })

  test('the honeypot drops the request silently', async ({ client, assert }) => {
    const { messages } = mail.fake()
    const { org, boat } = await charterFleet()

    const response = await client
      .post(`${pagePath(org, boat)}/request`)
      .form({ ...REQUEST, startsOn: dayIn(10), endsOn: dayIn(13), website: 'http://spam.test' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('publicBookingSubmitted', true)
    assert.lengthOf(await BoatReservation.all(), 0)
    messages.assertNoneSent()
  })

  test('consent is required', async ({ client, assert }) => {
    const { org, boat } = await charterFleet()

    await client
      .post(`${pagePath(org, boat)}/request`)
      .form({ ...REQUEST, consent: false, startsOn: dayIn(10), endsOn: dayIn(13) })
      .redirects(0)

    assert.lengthOf(await BoatReservation.all(), 0)
  })

  test('requests are throttled per IP, with a flash rather than a bare 429', async ({
    client,
    assert,
  }) => {
    const { org, boat } = await charterFleet()
    const path = `${pagePath(org, boat)}/request`

    // Les envois invalides consomment aussi le budget : le compteur passe avant la validation.
    for (let index = 0; index < 5; index += 1) {
      const passing = await client
        .post(path)
        .form({ ...REQUEST, consent: false })
        .redirects(0)
      passing.assertStatus(302)
    }
    const refused = await client
      .post(path)
      .form({ ...REQUEST, startsOn: dayIn(10), endsOn: dayIn(13) })
      .redirects(0)

    refused.assertStatus(302)
    refused.assertFlashMessage(
      'error',
      'Too many requests sent from this connection. Please try again in a few minutes.'
    )
    assert.lengthOf(await BoatReservation.all(), 0)
  })
})

test.group('Public booking — decision and settings (#881)', (group) => {
  group.each.setup(() => truncateDb())
  group.each.setup(() => {
    mail.fake()
  })
  group.each.teardown(() => mail.restore())

  async function publicRequest(boat: Boat) {
    return BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'option',
      source: 'public',
      requestLocale: 'en',
      startsAt: parisMidnight(10),
      endsAt: parisMidnight(13),
      clientName: 'Claire Dubois',
      clientEmail: 'claire@example.com',
    }).create()
  }

  test('confirming a public request emails the client in the request language', async ({
    client,
  }) => {
    const { messages } = mail.fake()
    const { user, boat } = await charterFleet()
    const reservation = await publicRequest(boat)

    await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
      .loginAs(user)
      .form({ status: 'confirmed' })
      .redirects(0)

    messages.assertSent(
      (message) =>
        message.hasTo('claire@example.com') && message.hasSubject('Booking confirmed — Ondine')
    )
  })

  test('declining a public request emails the client', async ({ client }) => {
    const { messages } = mail.fake()
    const { user, boat } = await charterFleet()
    const reservation = await publicRequest(boat)

    await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
      .loginAs(user)
      .form({ status: 'cancelled' })
      .redirects(0)

    messages.assertSent(
      (message) =>
        message.hasTo('claire@example.com') && message.hasSubject('Your booking request — Ondine')
    )
  })

  test('a request pushed out by a confirmation on the same dates is declined too', async ({
    client,
    assert,
  }) => {
    const { messages } = mail.fake()
    const { user, boat } = await charterFleet()
    const request = await publicRequest(boat)

    await client
      .post(`/boats/${boat.id}/reservations`)
      .loginAs(user)
      .form({
        clientName: 'Walk-in',
        status: 'confirmed',
        startsAt: `${dayIn(11)}T10:00`,
        endsAt: `${dayIn(13)}T18:00`,
        tzOffsetMinutes: 0,
      })
      .redirects(0)

    await request.refresh()
    assert.equal(request.status, 'cancelled')
    messages.assertSent((message) => message.hasTo('claire@example.com'))
  })

  test('an internal reservation never emails its client on a status change', async ({ client }) => {
    const { messages } = mail.fake()
    const { user, boat } = await charterFleet()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'option',
      startsAt: parisMidnight(10),
      endsAt: parisMidnight(13),
      clientEmail: 'walkin@example.com',
    }).create()

    await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
      .loginAs(user)
      .form({ status: 'confirmed' })
      .redirects(0)

    messages.assertNotSent((message) => message.hasTo('walkin@example.com'))
  })

  test('an admin opens the page: a slug is derived once and kept', async ({ client, assert }) => {
    const { user } = await charterFleet()
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Bélouga II',
    }).create()

    const opened = await client
      .patch(`/boats/${boat.id}/public-booking`)
      .loginAs(user)
      .form({ enabled: true })
      .redirects(0)
    opened.assertStatus(302)
    await boat.refresh()
    assert.isTrue(boat.publicBookingEnabled)
    assert.equal(boat.publicBookingSlug, 'belouga-ii')

    boat.name = 'Autre nom'
    await boat.save()
    await client.patch(`/boats/${boat.id}/public-booking`).loginAs(user).form({ enabled: false })
    await client.patch(`/boats/${boat.id}/public-booking`).loginAs(user).form({ enabled: true })
    await boat.refresh()
    assert.equal(boat.publicBookingSlug, 'belouga-ii')

    const page = await client.get(`/boats/${boat.id}/reservations`).loginAs(user).withInertia()
    const settings = (page.inertiaProps as { publicBooking: { enabled: boolean; url: string } })
      .publicBooking
    assert.isTrue(settings.enabled)
    assert.match(settings.url, /\/book\/[^/]+\/belouga-ii$/)
  })

  test('two boats with the same name get distinct slugs', async ({ assert }) => {
    const { user } = await charterFleet()
    const first = await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Ondine',
    }).create()
    const service = await app.container.make(PublicBookingService)

    await service.setEnabled(first, true)

    assert.equal(first.publicBookingSlug, 'ondine-2')
  })

  test('a mechanic without the manage right cannot open the page', async ({ client, assert }) => {
    const { user, boat } = await charterFleet()
    const mechanic = await createMechanicUser(user.organizationId!)
    boat.publicBookingEnabled = false
    await boat.save()

    await client
      .patch(`/boats/${boat.id}/public-booking`)
      .loginAs(mechanic)
      .form({ enabled: true })
      .redirects(0)

    await boat.refresh()
    assert.isFalse(boat.publicBookingEnabled)
  })
})

test.group('Public booking — purge (#881)', (group) => {
  group.each.setup(() => truncateDb())

  test('stale public requests are purged, real rentals and internal ones are kept', async ({
    assert,
  }) => {
    const { boat } = await charterFleet()
    const old = DateTime.now().minus({ days: 31 })
    const make = (overrides: Partial<BoatReservation>) =>
      BoatReservationFactory.merge({
        boatId: boat.id,
        organizationId: boat.organizationId,
        startsAt: DateTime.now().plus({ days: 10 }),
        endsAt: DateTime.now().plus({ days: 12 }),
        ...overrides,
      }).create()

    const staleOption = await make({ status: 'option', source: 'public' })
    const declined = await make({ status: 'cancelled', source: 'public' })
    const confirmed = await make({ status: 'confirmed', source: 'public' })
    const fresh = await make({ status: 'option', source: 'public' })
    const internal = await make({ status: 'option', source: 'internal' })
    for (const reservation of [staleOption, declined, confirmed, internal]) {
      reservation.createdAt = old
      await reservation.save()
    }

    const service = await app.container.make(PublicBookingService)
    const purged = await service.purgeExpiredRequests()

    assert.equal(purged, 2)
    const kept = await BoatReservation.query().orderBy('id')
    assert.deepEqual(
      kept.map((r) => r.id),
      [confirmed.id, fresh.id, internal.id]
    )
  })
})
