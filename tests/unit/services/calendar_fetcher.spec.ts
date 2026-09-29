import { test } from '@japa/runner'
import { ExternalCalendarSyncError } from '#exceptions/calendar_sync_errors'
import CalendarFetcher, {
  assertSafeCalendarUrl,
  guardedLookup,
  isPrivateAddress,
} from '#services/calendar_fetcher'

/**
 * Import de calendriers externes (#880) : l'URL est saisie par un utilisateur
 * et téléchargée par le serveur — les garde-fous SSRF.
 */

function codeOf(fn: () => unknown): string | null {
  try {
    fn()
    return null
  } catch (error) {
    return error instanceof ExternalCalendarSyncError ? error.code : 'other'
  }
}

test.group('Calendar fetcher — SSRF guards (#880)', () => {
  test('internal addresses are recognised, public ones are not', ({ assert }) => {
    for (const ip of [
      '127.0.0.1',
      '10.1.2.3',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '224.0.0.1',
      '::1',
      '::',
      'fc00::1',
      'fd12:3456::1',
      'fe80::1',
      '::ffff:127.0.0.1',
      '::ffff:10.0.0.1',
      '64:ff9b::a00:1',
      'not-an-ip',
    ]) {
      assert.isTrue(isPrivateAddress(ip), ip)
    }
    for (const ip of [
      '8.8.8.8',
      '172.32.0.1',
      '151.101.1.1',
      '2606:4700::1111',
      '::ffff:8.8.8.8',
    ]) {
      assert.isFalse(isPrivateAddress(ip), ip)
    }
  })

  test('only public https URLs on port 443 pass the static check', ({ assert }) => {
    assert.equal(
      assertSafeCalendarUrl('https://www.samboat.fr/ical/abc.ics').hostname,
      'www.samboat.fr'
    )
    // `webcal://` est le même flux servi en https.
    assert.equal(assertSafeCalendarUrl('webcal://calendar.example.com/x.ics').protocol, 'https:')

    for (const url of [
      'http://calendar.example.com/x.ics',
      'ftp://calendar.example.com/x.ics',
      'https://user:pass@calendar.example.com/x.ics',
      'https://calendar.example.com:8443/x.ics',
      'https://localhost/x.ics',
      'https://api.localhost/x.ics',
      'https://metadata.google.internal/x.ics',
      'https://127.0.0.1/x.ics',
      'https://169.254.169.254/latest/meta-data',
      'https://[::1]/x.ics',
      'not a url',
    ]) {
      assert.equal(
        codeOf(() => assertSafeCalendarUrl(url)),
        'unsafe_url',
        url
      )
    }
  })

  test('a name resolving to an internal address is refused at connection time', async ({
    assert,
  }) => {
    const error = await new Promise<unknown>((resolve) => {
      guardedLookup('localhost', {}, (err) => resolve(err))
    })
    assert.instanceOf(error, ExternalCalendarSyncError)
    assert.equal((error as ExternalCalendarSyncError).code, 'unsafe_url')
  })

  test('the fetcher refuses an internal address before any request', async ({ assert }) => {
    await assert.rejects(
      () => new CalendarFetcher().fetch('https://127.0.0.1/calendar.ics'),
      ExternalCalendarSyncError
    )
  })
})
