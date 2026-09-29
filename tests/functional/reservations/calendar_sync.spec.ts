import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import ical, { type VEvent } from 'node-ical'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/utils/db'
import AuditLog from '#models/audit_log'
import BoatReservation from '#models/boat_reservation'
import CalendarFeed from '#models/calendar_feed'
import ExternalCalendar from '#models/external_calendar'
import ExternalCalendarEvent from '#models/external_calendar_event'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { BoatMaintenanceTaskFactory } from '#database/factories/boat_maintenance_task_factory'
import CalendarFetcher from '#services/calendar_fetcher'
import { ExternalCalendarSyncError } from '#exceptions/calendar_sync_errors'
import { assertPageContract } from '#tests/support/inertia_page'
import {
  createAdminUser,
  createCharterAdminUser,
  createMechanicUser,
  createMemberUser,
} from '#tests/functional/helpers'
import type Boat from '#models/boat'
import type User from '#models/user'
import type { ApiClient } from '@japa/api-client'

/**
 * Synchronisation iCal des réservations (#880) : flux exporté par jeton,
 * calendriers externes importés qui bloquent les dates.
 */

/** Faux téléchargement : le flux servi, ou l'erreur levée. */
class FakeFetcher {
  body = ''
  error: ExternalCalendarSyncError | null = null
  urls: string[] = []

  async fetch(url: string): Promise<string> {
    this.urls.push(url)
    if (this.error) throw this.error
    return this.body
  }
}

function ics(...events: { uid: string; start: string; end: string; summary?: string }[]) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Samboat//EN',
    ...events.flatMap((e) => [
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTART;VALUE=DATE:${e.start}`,
      `DTEND;VALUE=DATE:${e.end}`,
      `SUMMARY:${e.summary ?? 'Reserved'}`,
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ].join('\r\n')
}

/** `YYYYMMDD` dans `days` jours. */
function day(days: number): string {
  return DateTime.now().plus({ days }).toFormat('yyyyLLdd')
}

async function charterFleet() {
  const user = await createCharterAdminUser()
  user.locale = 'fr'
  await user.save()
  const boat = await BoatFactory.merge({
    organizationId: user.organizationId!,
    name: 'Ondine',
  }).create()
  return { user, boat }
}

async function reservation(boat: Boat, overrides: Partial<BoatReservation> = {}) {
  const startsAt = DateTime.now().plus({ days: 10 }).startOf('hour')
  return BoatReservationFactory.merge({
    boatId: boat.id,
    organizationId: boat.organizationId,
    status: 'confirmed',
    startsAt,
    endsAt: startsAt.plus({ days: 3 }),
    clientName: 'Alice Martin',
    ...overrides,
  }).create()
}

function tokenOf(feed: CalendarFeed): string {
  return `/calendar/${feed.token}.ics`
}

async function readFeed(client: ApiClient, path: string): Promise<VEvent[]> {
  const response = await client.get(path)
  return vevents(response.text())
}

async function statusOf(client: ApiClient, path: string): Promise<number> {
  const response = await client.get(path)
  return response.status()
}

function vevents(body: string): VEvent[] {
  return Object.values(ical.sync.parseICS(body)).filter(
    (component) => component?.type === 'VEVENT'
  ) as VEvent[]
}

test.group('Calendar sync — exported feed (#880)', (group) => {
  group.each.setup(() => truncateDb())

  test('a boat feed publishes confirmed and option bookings, never the client by default', async ({
    client,
    assert,
  }) => {
    const { user, boat } = await charterFleet()
    const confirmed = await reservation(boat)
    const option = await reservation(boat, {
      status: 'option',
      startsAt: DateTime.now().plus({ days: 30 }),
      endsAt: DateTime.now().plus({ days: 32 }),
    })
    await reservation(boat, {
      status: 'cancelled',
      startsAt: DateTime.now().plus({ days: 50 }),
      endsAt: DateTime.now().plus({ days: 52 }),
    })
    const otherBoat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await reservation(otherBoat)

    const created = await client
      .post(`/boats/${boat.id}/calendar-feed`)
      .loginAs(user)
      .form({})
      .redirects(0)
    created.assertStatus(302)
    created.assertFlashMessage(
      'success',
      'Flux iCal créé. Copiez son adresse dans votre agenda ou sur la plateforme.'
    )

    const feed = await CalendarFeed.findByOrFail('boatId', boat.id)
    assert.match(feed.token, /^[A-Za-z0-9_-]{43}$/)

    const response = await client.get(tokenOf(feed))
    response.assertStatus(200)
    response.assertHeader('content-type', 'text/calendar; charset=utf-8')
    assert.include(response.header('cache-control'), 'max-age=300')

    const events = vevents(response.text())
    assert.lengthOf(events, 2)
    const byUid = new Map(events.map((e) => [e.uid, e]))
    const confirmedEvent = byUid.get(`reservation-${confirmed.id}@localhost`)!
    assert.equal(confirmedEvent.status, 'CONFIRMED')
    assert.equal(confirmedEvent.summary, 'Ondine — Réservé')
    assert.equal(new Date(confirmedEvent.start!).toISOString(), confirmed.startsAt.toUTC().toISO())
    assert.equal(byUid.get(`reservation-${option.id}@localhost`)!.status, 'TENTATIVE')
    assert.notInclude(response.text(), 'Alice Martin')

    const audit = await AuditLog.query().where('action', 'calendar.token_created').firstOrFail()
    assert.equal(audit.userId, user.id)
  })

  test('moving a booking raises its SEQUENCE; its UID stays', async ({ client, assert }) => {
    const { user, boat } = await charterFleet()
    const booking = await reservation(boat)
    await client.post(`/boats/${boat.id}/calendar-feed`).loginAs(user).form({})
    const feed = await CalendarFeed.findByOrFail('boatId', boat.id)

    const [before] = await readFeed(client, tokenOf(feed))
    booking.endsAt = booking.endsAt.plus({ days: 1 })
    await booking.save()
    booking.notes = 'Ponton B'
    await booking.save()
    const [after] = await readFeed(client, tokenOf(feed))

    assert.equal(after.uid, before.uid)
    assert.equal(Number(before.sequence), 0)
    assert.equal(Number(after.sequence), 1)
  })

  test('options add the client name and the planned maintenance', async ({ client, assert }) => {
    const { user, boat } = await charterFleet()
    await reservation(boat)
    await BoatMaintenanceTaskFactory.merge({
      boatId: boat.id,
      title: 'Carénage',
      status: 'open',
      dueAt: DateTime.now().plus({ days: 20 }),
    }).create()

    await client
      .post(`/boats/${boat.id}/calendar-feed`)
      .loginAs(user)
      .form({ includeClientName: 'true', includeMaintenance: 'true' })
    const feed = await CalendarFeed.findByOrFail('boatId', boat.id)

    const withOptions = await readFeed(client, tokenOf(feed))
    const summaries = withOptions.map((e) => e.summary)
    assert.sameMembers(summaries, ['Ondine — Alice Martin', 'Ondine — Entretien : Carénage'])

    // Décocher garde l'URL.
    await client.patch(`/boats/${boat.id}/calendar-feed`).loginAs(user).form({})
    await feed.refresh()
    const plainFeed = await readFeed(client, tokenOf(feed))
    const plain = plainFeed.map((e) => e.summary)
    assert.deepEqual(plain, ['Ondine — Réservé'])
  })

  test('the fleet feed covers every boat; imported slots never echo back', async ({
    client,
    assert,
  }) => {
    const { user, boat } = await charterFleet()
    const other = await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Bora',
    }).create()
    await reservation(boat)
    await reservation(other)
    const external = await ExternalCalendar.create({
      organizationId: user.organizationId!,
      boatId: boat.id,
      name: 'Samboat',
      url: 'https://www.samboat.fr/ical/x.ics',
    })
    await ExternalCalendarEvent.create({
      externalCalendarId: external.id,
      boatId: boat.id,
      uid: 'samboat-1',
      summary: 'Reserved',
      startsAt: DateTime.now().plus({ days: 40 }),
      endsAt: DateTime.now().plus({ days: 45 }),
    })

    await client.post('/reservations/calendar-feed').loginAs(user).form({})
    const feed = await CalendarFeed.query().whereNull('boatId').firstOrFail()
    const events = await readFeed(client, tokenOf(feed))

    assert.sameMembers(
      events.map((e) => e.summary),
      ['Ondine — Réservé', 'Bora — Réservé']
    )
  })

  test('regenerating or revoking kills the old address', async ({ client, assert }) => {
    const { user, boat } = await charterFleet()
    await client.post(`/boats/${boat.id}/calendar-feed`).loginAs(user).form({})
    const first = await CalendarFeed.findByOrFail('boatId', boat.id)

    await client.post(`/boats/${boat.id}/calendar-feed`).loginAs(user).form({})
    const second = await CalendarFeed.findByOrFail('boatId', boat.id)
    assert.notEqual(second.token, first.token)
    assert.equal(await statusOf(client, tokenOf(first)), 404)
    assert.equal(await statusOf(client, tokenOf(second)), 200)

    await client.delete(`/boats/${boat.id}/calendar-feed`).loginAs(user)
    assert.equal(await statusOf(client, tokenOf(second)), 404)
    assert.lengthOf(await AuditLog.query().where('action', 'calendar.token_revoked'), 2)
  })

  test('an unknown, malformed or downgraded token answers 404', async ({ client, assert }) => {
    assert.equal(await statusOf(client, `/calendar/${'a'.repeat(43)}.ics`), 404)
    assert.equal(await statusOf(client, '/calendar/short.ics'), 404)
    assert.equal(await statusOf(client, `/calendar/${'a'.repeat(43)}`), 404)

    // Organisation sans module Location : le flux s'éteint.
    const user = await createAdminUser('starter')
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const feed = await CalendarFeed.create({
      organizationId: user.organizationId!,
      boatId: boat.id,
      token: 'b'.repeat(43),
    })
    assert.equal(await statusOf(client, tokenOf(feed)), 404)
  })

  test('a mechanic cannot publish a feed; a member can', async ({ client, assert }) => {
    const { user, boat } = await charterFleet()
    const mechanic = await createMechanicUser(user.organizationId!)
    const member = await createMemberUser(user.organizationId!)

    const refused = await client
      .post(`/boats/${boat.id}/calendar-feed`)
      .header('Accept', 'application/json')
      .loginAs(mechanic)
      .form({})
    refused.assertStatus(403)
    const refusedFleet = await client
      .post('/reservations/calendar-feed')
      .header('Accept', 'application/json')
      .loginAs(mechanic)
      .form({})
    refusedFleet.assertStatus(403)
    assert.lengthOf(await CalendarFeed.all(), 0)

    await client.post(`/boats/${boat.id}/calendar-feed`).loginAs(member).form({})
    assert.lengthOf(await CalendarFeed.all(), 1)
  })

  test('another organization cannot touch the boat feed', async ({ client, assert }) => {
    const { boat } = await charterFleet()
    const intruder = await createCharterAdminUser()
    await client.post(`/boats/${boat.id}/calendar-feed`).loginAs(intruder).form({}).redirects(0)
    assert.lengthOf(await CalendarFeed.all(), 0)
  })
})

test.group('Calendar sync — imported calendars (#880)', (group) => {
  let fetcher: FakeFetcher

  group.each.setup(() => truncateDb())
  group.each.setup(() => {
    fetcher = new FakeFetcher()
    app.container.swap(CalendarFetcher, () => fetcher as unknown as CalendarFetcher)
    return () => app.container.restore(CalendarFetcher)
  })

  async function addCalendar(
    client: any,
    user: User,
    boat: Boat,
    url = 'https://www.samboat.fr/ical/abc.ics'
  ) {
    return client
      .post(`/boats/${boat.id}/external-calendars`)
      .loginAs(user)
      .form({ name: 'Samboat', url })
      .redirects(0)
  }

  test('adding a feed imports its slots and shows them on the boat page', async ({
    client,
    assert,
  }) => {
    const { user, boat } = await charterFleet()
    fetcher.body = ics({ uid: 's-1', start: day(20), end: day(27) })

    const response = await addCalendar(client, user, boat)
    response.assertFlashMessage('success', 'Calendrier externe ajouté : 1 créneau(x) importé(s).')

    const calendar = await ExternalCalendar.findByOrFail('boatId', boat.id)
    assert.equal(calendar.eventCount, 1)
    assert.isNull(calendar.lastError)
    assert.isNotNull(calendar.lastSyncedAt)
    assert.deepEqual(fetcher.urls, ['https://www.samboat.fr/ical/abc.ics'])

    const page = await client.get(`/boats/${boat.id}/reservations`).loginAs(user).withInertia()
    assertPageContract(assert, page, 'boats/reservations')
    const props = page.inertiaProps as Record<string, any>
    assert.lengthOf(props.externalBlocks, 1)
    assert.equal(props.externalBlocks[0].calendarName, 'Samboat')
    assert.deepInclude(props.calendarSync.externalCalendars[0], {
      name: 'Samboat',
      host: 'www.samboat.fr',
      eventCount: 1,
    })
    assert.notProperty(props.calendarSync.externalCalendars[0], 'url')

    const audit = await AuditLog.query().where('action', 'external_calendar.added').firstOrFail()
    assert.deepInclude(audit.metadata!, { host: 'www.samboat.fr' })
  })

  test('a re-sync is idempotent: moved slots update, vanished slots go', async ({
    client,
    assert,
  }) => {
    const { user, boat } = await charterFleet()
    fetcher.body = ics(
      { uid: 's-1', start: day(20), end: day(27) },
      { uid: 's-2', start: day(40), end: day(47) }
    )
    await addCalendar(client, user, boat)
    const calendar = await ExternalCalendar.findByOrFail('boatId', boat.id)
    const kept = await ExternalCalendarEvent.findByOrFail('uid', 's-1')

    // Même flux : rien ne bouge.
    await client.post(`/boats/${boat.id}/external-calendars/${calendar.id}/sync`).loginAs(user)
    assert.lengthOf(await ExternalCalendarEvent.all(), 2)

    // s-1 déplacé, s-2 annulé côté plateforme.
    fetcher.body = ics({ uid: 's-1', start: day(21), end: day(28) })
    await client.post(`/boats/${boat.id}/external-calendars/${calendar.id}/sync`).loginAs(user)

    const events = await ExternalCalendarEvent.all()
    assert.lengthOf(events, 1)
    assert.equal(events[0].id, kept.id)
    assert.equal(events[0].startsAt.setZone('Europe/Paris').toFormat('yyyyLLdd'), day(21))
    await calendar.refresh()
    assert.equal(calendar.eventCount, 1)
  })

  test('an imported slot blocks a new booking; an unrelated edit still goes through', async ({
    client,
    assert,
  }) => {
    const { user, boat } = await charterFleet()
    const existing = await reservation(boat, {
      startsAt: DateTime.now().plus({ days: 60 }),
      endsAt: DateTime.now().plus({ days: 62 }),
    })
    // Le flux importé chevauche la réservation déjà posée (double réservation).
    fetcher.body = ics(
      { uid: 's-1', start: day(20), end: day(27) },
      { uid: 's-2', start: day(60), end: day(61) }
    )
    const added = await addCalendar(client, user, boat)
    added.assertFlashMessage(
      'error',
      '1 créneau(x) importé(s) chevauchent une réservation FleetAi : vérifiez les doubles réservations.'
    )
    const calendar = await ExternalCalendar.findByOrFail('boatId', boat.id)
    assert.equal(calendar.conflictCount, 1)

    const start = DateTime.now().plus({ days: 22 }).set({ hour: 10, minute: 0 })
    const refused = await client
      .post(`/boats/${boat.id}/reservations`)
      .loginAs(user)
      .form({
        startsAt: start.toFormat("yyyy-LL-dd'T'HH:mm"),
        endsAt: start.plus({ days: 2 }).toFormat("yyyy-LL-dd'T'HH:mm"),
        tzOffsetMinutes: '0',
        clientName: 'Bob',
        status: 'option',
      })
      .redirects(0)
    refused.assertFlashMessage(
      'error',
      'Ce bateau est déjà loué sur « Samboat » pendant cette période (calendrier importé).'
    )
    assert.lengthOf(await BoatReservation.query().where('clientName', 'Bob'), 0)

    // La réservation déjà posée reste modifiable tant qu'elle ne bouge pas.
    const edited = await client
      .patch(`/boats/${boat.id}/reservations/${existing.id}`)
      .loginAs(user)
      .form({ notes: 'Ponton B' })
      .redirects(0)
    edited.assertStatus(302)
    await existing.refresh()
    assert.equal(existing.notes, 'Ponton B')
  })

  test('a failed sync keeps the last slots and records the reason', async ({ client, assert }) => {
    const { user, boat } = await charterFleet()
    fetcher.body = ics({ uid: 's-1', start: day(20), end: day(27) })
    await addCalendar(client, user, boat)
    const calendar = await ExternalCalendar.findByOrFail('boatId', boat.id)

    fetcher.error = new ExternalCalendarSyncError('timeout')
    const response = await client
      .post(`/boats/${boat.id}/external-calendars/${calendar.id}/sync`)
      .loginAs(user)
      .redirects(0)
    response.assertFlashMessage(
      'error',
      'La synchronisation a échoué : le calendrier n’a pas répondu à temps.'
    )

    await calendar.refresh()
    assert.equal(calendar.lastError, 'timeout')
    assert.lengthOf(await ExternalCalendarEvent.all(), 1)
  })

  test('unsafe addresses are refused before anything is stored or fetched', async ({
    client,
    assert,
  }) => {
    const { user, boat } = await charterFleet()
    for (const url of [
      'http://www.samboat.fr/ical/abc.ics',
      'https://127.0.0.1/ical.ics',
      'https://localhost/ical.ics',
      'https://169.254.169.254/latest/meta-data',
    ]) {
      const response = await addCalendar(client, user, boat, url)
      response.assertFlashMessage(
        'error',
        'Adresse refusée : seul un flux https public (port 443) peut être importé.'
      )
    }
    assert.lengthOf(await ExternalCalendar.all(), 0)
    assert.isEmpty(fetcher.urls)
  })

  test('removing a calendar frees its dates', async ({ client, assert }) => {
    const { user, boat } = await charterFleet()
    fetcher.body = ics({ uid: 's-1', start: day(20), end: day(27) })
    await addCalendar(client, user, boat)
    const calendar = await ExternalCalendar.findByOrFail('boatId', boat.id)

    await client.delete(`/boats/${boat.id}/external-calendars/${calendar.id}`).loginAs(user)

    assert.lengthOf(await ExternalCalendar.all(), 0)
    assert.lengthOf(await ExternalCalendarEvent.all(), 0)
    assert.lengthOf(await AuditLog.query().where('action', 'external_calendar.removed'), 1)
  })

  test('another organization cannot sync or remove the calendar', async ({ client, assert }) => {
    const { user, boat } = await charterFleet()
    fetcher.body = ics({ uid: 's-1', start: day(20), end: day(27) })
    await addCalendar(client, user, boat)
    const calendar = await ExternalCalendar.findByOrFail('boatId', boat.id)
    const intruder = await createCharterAdminUser()

    await client
      .delete(`/boats/${boat.id}/external-calendars/${calendar.id}`)
      .loginAs(intruder)
      .redirects(0)
    assert.lengthOf(await ExternalCalendar.all(), 1)
  })

  test('the fleet timeline carries the imported slots', async ({ client, assert }) => {
    const { user, boat } = await charterFleet()
    fetcher.body = ics({ uid: 's-1', start: day(20), end: day(27) })
    await addCalendar(client, user, boat)

    const page = await client.get('/reservations').loginAs(user).withInertia()
    assertPageContract(assert, page, 'reservations/index')
    const props = page.inertiaProps as Record<string, any>
    assert.lengthOf(props.calendarEntries[0].external, 1)
    assert.isNull(props.fleetCalendarFeed)
    assert.isTrue(props.canManageFleetCalendar)
  })
})
