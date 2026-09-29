import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import SyncExternalCalendars from '#jobs/sync_external_calendars'
import ExternalCalendar from '#models/external_calendar'
import ExternalCalendarEvent from '#models/external_calendar_event'
import { BoatFactory } from '#database/factories/boat_factory'
import CalendarFetcher from '#services/calendar_fetcher'
import { createAdminUser, createCharterAdminUser } from '#tests/functional/helpers'

/**
 * Cron `SyncExternalCalendars` (#880) : toutes les 30 minutes, relit chaque
 * calendrier externe — sauf ceux d'une organisation sans module Location.
 */

function feed(uid: string): string {
  const start = DateTime.now().plus({ days: 10 }).toFormat('yyyyLLdd')
  const end = DateTime.now().plus({ days: 12 }).toFormat('yyyyLLdd')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

async function calendarFor(organizationId: number) {
  const boat = await BoatFactory.merge({ organizationId }).create()
  return ExternalCalendar.create({
    organizationId,
    boatId: boat.id,
    name: 'Samboat',
    url: `https://calendar.example.com/${organizationId}.ics`,
  })
}

test.group('Job — SyncExternalCalendars (#880)', () => {
  test('syncs every calendar of an organization that still has the charter module', async ({
    assert,
  }) => {
    const charter = await createCharterAdminUser()
    const starter = await createAdminUser('starter')
    const active = await calendarFor(charter.organizationId!)
    const dormant = await calendarFor(starter.organizationId!)

    const fetched: string[] = []
    app.container.swap(
      CalendarFetcher,
      () =>
        ({
          async fetch(url: string) {
            fetched.push(url)
            return feed('slot-1')
          },
        }) as unknown as CalendarFetcher
    )

    try {
      const job = await app.container.make(SyncExternalCalendars)
      await job.execute()
    } finally {
      app.container.restore(CalendarFetcher)
    }

    assert.deepEqual(fetched, [active.url])
    await active.refresh()
    await dormant.refresh()
    assert.equal(active.eventCount, 1)
    assert.isNotNull(active.lastSyncedAt)
    assert.isNull(dormant.lastSyncedAt)
    assert.lengthOf(await ExternalCalendarEvent.query().where('externalCalendarId', active.id), 1)
  })
})
