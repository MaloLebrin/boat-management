import { test } from '@japa/runner'
import ical, { type VEvent } from 'node-ical'
import { DateTime } from 'luxon'
import { ExternalCalendarSyncError } from '#exceptions/calendar_sync_errors'
import {
  escapeIcsText,
  foldIcsLine,
  parseIcsCalendar,
  parseIcsDuration,
  renderIcsCalendar,
  unescapeIcsText,
  unfoldIcsLines,
} from '#services/ical_service'
import { occupiedDays, selectEvents } from '#services/external_calendar_service'
import type { IcsCalendarInput } from '#shared/types/calendar_sync'

/**
 * Synchronisation iCal (#880) : écriture (RFC 5545, vérifiée par `node-ical`,
 * un lecteur indépendant) et lecture des flux importés.
 */

function calendar(...events: string[]): string {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Test//EN', ...events, 'END:VCALENDAR'].join(
    '\r\n'
  )
}

const SAMPLE: IcsCalendarInput = {
  name: 'FleetAi — Ondine',
  generatedAt: '2026-06-01T08:00:00.000Z',
  events: [
    {
      uid: 'reservation-1@fleetai.test',
      summary: 'Ondine — Réservé',
      url: 'https://fleetai.test/boats/1/reservations',
      start: { dateTime: '2026-07-01T08:00:00.000Z' },
      end: { dateTime: '2026-07-08T18:00:00.000Z' },
      status: 'CONFIRMED',
      sequence: 2,
      lastModified: '2026-05-20T10:00:00.000Z',
    },
    {
      uid: 'reservation-2@fleetai.test',
      summary: 'Ondine — Option; semaine, pont',
      start: { dateTime: '2026-08-01T08:00:00.000Z' },
      end: { dateTime: '2026-08-03T08:00:00.000Z' },
      status: 'TENTATIVE',
      sequence: 0,
      lastModified: null,
    },
    {
      uid: 'maintenance-task-9@fleetai.test',
      summary: 'Ondine — Entretien : carénage',
      start: { date: '2026-09-10' },
      end: { date: '2026-09-12' },
      status: 'CONFIRMED',
      sequence: 0,
      lastModified: null,
    },
  ],
}

test.group('iCal — rendering (#880)', () => {
  test('the feed is valid RFC 5545 for an independent reader', ({ assert }) => {
    const body = renderIcsCalendar(SAMPLE)
    const parsed = ical.sync.parseICS(body)
    const events = Object.values(parsed).filter((c) => c?.type === 'VEVENT') as VEvent[]

    assert.lengthOf(events, 3)
    const confirmed = events.find((e) => e.uid === 'reservation-1@fleetai.test')!
    assert.equal(new Date(confirmed.start!).toISOString(), '2026-07-01T08:00:00.000Z')
    assert.equal(new Date(confirmed.end!).toISOString(), '2026-07-08T18:00:00.000Z')
    assert.equal(confirmed.status, 'CONFIRMED')
    assert.equal(Number(confirmed.sequence), 2)
    assert.equal(confirmed.summary, 'Ondine — Réservé')

    const option = events.find((e) => e.uid === 'reservation-2@fleetai.test')!
    assert.equal(option.status, 'TENTATIVE')
    assert.equal(option.summary, 'Ondine — Option; semaine, pont')

    const task = events.find((e) => e.uid === 'maintenance-task-9@fleetai.test')!
    assert.equal(task.datetype, 'date')
  })

  test('lines end in CRLF, carry the mandatory properties and fit in 75 octets', ({ assert }) => {
    const body = renderIcsCalendar({
      ...SAMPLE,
      events: [{ ...SAMPLE.events[0], summary: `Ondine — ${'é'.repeat(80)}` }],
    })

    assert.isTrue(body.endsWith('END:VCALENDAR\r\n'))
    assert.notMatch(body, /[^\r]\n/)
    for (const line of body.split('\r\n')) {
      assert.isAtMost(Buffer.byteLength(line, 'utf8'), 75, line)
    }
    for (const property of ['VERSION:2.0', 'PRODID:', 'DTSTAMP:20260601T080000Z', 'UID:']) {
      assert.include(body, property)
    }
    assert.include(body, 'DTSTART:20260701T080000Z')
  })

  test('all-day events use VALUE=DATE', ({ assert }) => {
    const body = renderIcsCalendar(SAMPLE)
    assert.include(body, 'DTSTART;VALUE=DATE:20260910')
    assert.include(body, 'DTEND;VALUE=DATE:20260912')
  })

  test('TEXT values are escaped and round-trip', ({ assert }) => {
    const raw = 'a\\b;c,d\ne'
    assert.equal(escapeIcsText(raw), 'a\\\\b\\;c\\,d\\ne')
    assert.equal(unescapeIcsText(escapeIcsText(raw)), raw)
  })

  test('folding never splits a UTF-8 character and unfolds back', ({ assert }) => {
    const line = `SUMMARY:${'€'.repeat(60)}`
    const folded = foldIcsLine(line)
    for (const part of folded.split('\r\n')) {
      assert.isAtMost(Buffer.byteLength(part, 'utf8'), 75)
    }
    assert.deepEqual(unfoldIcsLines(folded), [line])
  })
})

test.group('iCal — parsing imported feeds (#880)', () => {
  test('all-day bookings (Airbnb-style) are read in Europe/Paris, end exclusive', ({ assert }) => {
    const events = parseIcsCalendar(
      calendar(
        'BEGIN:VEVENT',
        'DTSTAMP:20260601T000000Z',
        'DTSTART;VALUE=DATE:20260701',
        'DTEND;VALUE=DATE:20260708',
        'UID:abc@platform',
        'SUMMARY:Reserved',
        'END:VEVENT'
      )
    )
    assert.deepEqual(events, [
      {
        uid: 'abc@platform',
        summary: 'Reserved',
        startsAt: '2026-06-30T22:00:00.000Z',
        endsAt: '2026-07-07T22:00:00.000Z',
      },
    ])
  })

  test('UTC, TZID and floating date-times', ({ assert }) => {
    const [utc, ny, floating] = parseIcsCalendar(
      calendar(
        'BEGIN:VEVENT',
        'UID:1',
        'DTSTART:20260701T080000Z',
        'DTEND:20260701T180000Z',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:2',
        'DTSTART;TZID=America/New_York:20260701T080000',
        'DTEND;TZID=America/New_York:20260701T100000',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:3',
        'DTSTART:20260701T080000',
        'DTEND;TZID="Romance Standard Time":20260701T100000',
        'END:VEVENT'
      )
    )
    assert.equal(utc.startsAt, '2026-07-01T08:00:00.000Z')
    assert.equal(ny.startsAt, '2026-07-01T12:00:00.000Z')
    assert.equal(ny.endsAt, '2026-07-01T14:00:00.000Z')
    // Flottante et TZID Windows inconnu : Europe/Paris (UTC+2 en été).
    assert.equal(floating.startsAt, '2026-07-01T06:00:00.000Z')
    assert.equal(floating.endsAt, '2026-07-01T08:00:00.000Z')
  })

  test('DURATION, missing end and empty ranges', ({ assert }) => {
    const events = parseIcsCalendar(
      calendar(
        'BEGIN:VEVENT',
        'UID:duration',
        'DTSTART:20260701T080000Z',
        'DURATION:P1DT2H',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:one-day',
        'DTSTART;VALUE=DATE:20260710',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:instant',
        'DTSTART:20260701T080000Z',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:reversed',
        'DTSTART:20260702T080000Z',
        'DTEND:20260701T080000Z',
        'END:VEVENT'
      )
    )
    assert.deepEqual(
      events.map((e) => [e.uid, e.startsAt, e.endsAt]),
      [
        ['duration', '2026-07-01T08:00:00.000Z', '2026-07-02T10:00:00.000Z'],
        ['one-day', '2026-07-09T22:00:00.000Z', '2026-07-10T22:00:00.000Z'],
      ]
    )
  })

  test('cancelled and free-time events block nothing; alarms are ignored', ({ assert }) => {
    const events = parseIcsCalendar(
      calendar(
        'BEGIN:VEVENT',
        'UID:cancelled',
        'STATUS:CANCELLED',
        'DTSTART:20260701T080000Z',
        'DTEND:20260702T080000Z',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:free',
        'TRANSP:TRANSPARENT',
        'DTSTART:20260701T080000Z',
        'DTEND:20260702T080000Z',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:kept',
        'SUMMARY:Location',
        'DTSTART:20260701T080000Z',
        'DTEND:20260702T080000Z',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'SUMMARY:Alarm text',
        'TRIGGER:-PT15M',
        'END:VALARM',
        'END:VEVENT'
      )
    )
    assert.lengthOf(events, 1)
    assert.equal(events[0].uid, 'kept')
    assert.equal(events[0].summary, 'Location')
  })

  test('folded, escaped lines and a modified occurrence keep distinct UIDs', ({ assert }) => {
    const events = parseIcsCalendar(
      calendar(
        'BEGIN:VEVENT',
        'UID:series',
        'SUMMARY:Semaine\\, Dupont',
        ' et famille',
        'DTSTART:20260701T080000Z',
        'DTEND:20260702T080000Z',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:series',
        'RECURRENCE-ID:20260708T080000Z',
        'DTSTART:20260709T080000Z',
        'DTEND:20260710T080000Z',
        'END:VEVENT'
      )
    )
    assert.equal(events[0].summary, 'Semaine, Dupontet famille')
    assert.deepEqual(
      events.map((e) => e.uid),
      ['series', 'series#20260708T080000Z']
    )
  })

  test('a document that is not a calendar is refused', ({ assert }) => {
    try {
      parseIcsCalendar('<!doctype html><html>Login</html>')
      assert.fail('should throw')
    } catch (error) {
      assert.instanceOf(error, ExternalCalendarSyncError)
      assert.equal((error as ExternalCalendarSyncError).code, 'invalid_ics')
    }
  })

  test('our own feed parses back to the same slots', ({ assert }) => {
    const events = parseIcsCalendar(renderIcsCalendar(SAMPLE))
    assert.deepEqual(
      events.map((e) => [e.uid, e.startsAt, e.endsAt]),
      [
        ['reservation-1@fleetai.test', '2026-07-01T08:00:00.000Z', '2026-07-08T18:00:00.000Z'],
        ['reservation-2@fleetai.test', '2026-08-01T08:00:00.000Z', '2026-08-03T08:00:00.000Z'],
        ['maintenance-task-9@fleetai.test', '2026-09-09T22:00:00.000Z', '2026-09-11T22:00:00.000Z'],
      ]
    )
    assert.equal(events[1].summary, 'Ondine — Option; semaine, pont')
  })

  test('DURATION values', ({ assert }) => {
    assert.equal(parseIcsDuration('P1W')?.as('days'), 7)
    assert.equal(parseIcsDuration('PT3H30M')?.as('minutes'), 210)
    assert.isNull(parseIcsDuration('P'))
    assert.isNull(parseIcsDuration('PT'))
    assert.isNull(parseIcsDuration('1 day'))
  })

  test('selection drops old slots, duplicates and keeps the nearest first', ({ assert }) => {
    const now = DateTime.fromISO('2026-06-01T00:00:00Z')
    const slot = (uid: string, start: string, end: string) => ({
      uid,
      summary: null,
      startsAt: start,
      endsAt: end,
    })
    const selected = selectEvents(
      [
        slot('late', '2026-08-01T00:00:00.000Z', '2026-08-02T00:00:00.000Z'),
        slot('old', '2026-03-01T00:00:00.000Z', '2026-03-02T00:00:00.000Z'),
        slot('recent', '2026-05-20T00:00:00.000Z', '2026-05-21T00:00:00.000Z'),
        slot('late', '2026-09-01T00:00:00.000Z', '2026-09-02T00:00:00.000Z'),
      ],
      now
    )
    assert.deepEqual(
      selected.map((e) => e.uid),
      ['recent', 'late']
    )
  })
})

test.group('iCal — imported slot days (#880)', () => {
  test('a whole-day slot covers its Paris days only; a partial day counts', ({ assert }) => {
    const [allDay] = parseIcsCalendar(
      calendar(
        'BEGIN:VEVENT',
        'UID:1',
        'DTSTART;VALUE=DATE:20260701',
        'DTEND;VALUE=DATE:20260708',
        'END:VEVENT'
      )
    )
    assert.deepEqual(
      occupiedDays(DateTime.fromISO(allDay.startsAt), DateTime.fromISO(allDay.endsAt)),
      { startsOn: '2026-07-01', endsOn: '2026-07-08' }
    )
    assert.deepEqual(
      occupiedDays(
        DateTime.fromISO('2026-07-01T08:00:00Z'),
        DateTime.fromISO('2026-07-03T16:00:00Z')
      ),
      { startsOn: '2026-07-01', endsOn: '2026-07-04' }
    )
  })
})
