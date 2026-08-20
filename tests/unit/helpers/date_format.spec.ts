import { test } from '@japa/runner'
import {
  EMPTY_DATE,
  formatDate,
  formatDateLong,
  formatDateTime,
  resolveLocaleTag,
} from '#shared/helpers/date_format'

/**
 * The PDF services render their generation date through this helper with
 * `i18n.locale` (#461). Before, they called `toLocaleDateString()` with no
 * argument, which follows the *server* locale — so a French user could get a US
 * date on their invoice depending on where the container ran. These tests run in
 * the Adonis/Node runtime the PDFs are generated in, which is the one whose ICU
 * data has to be there for the long month names to resolve.
 */
test.group('shared/helpers/date_format', () => {
  test('maps the app locales to explicit BCP 47 tags', ({ assert }) => {
    assert.equal(resolveLocaleTag('fr'), 'fr-FR')
    assert.equal(resolveLocaleTag('en'), 'en-US')
  })

  test('falls back to en when the locale is unknown or missing', ({ assert }) => {
    assert.equal(resolveLocaleTag('de'), 'en-US')
    assert.equal(resolveLocaleTag(null), 'en-US')
  })

  test('formatDate renders the numeric style of each locale', ({ assert }) => {
    assert.equal(formatDate('2026-07-15', 'fr'), '15/07/2026')
    assert.equal(formatDate('2026-07-15', 'en'), '07/15/2026')
  })

  test('formatDate does not depend on the server locale', ({ assert }) => {
    // Whatever the host is set to, a French user gets a French date.
    assert.equal(formatDate(new Date(2026, 6, 15), 'fr'), '15/07/2026')
  })

  test('formatDateLong resolves month names in both locales', ({ assert }) => {
    assert.equal(formatDateLong('2026-07-15', 'fr'), '15 juillet 2026')
    assert.equal(formatDateLong('2026-07-15', 'en'), 'July 15, 2026')
  })

  test('formatDateTime never renders seconds', ({ assert }) => {
    assert.equal(formatDateTime(new Date(2026, 6, 15, 15, 14, 34), 'fr'), '15/07/2026 15:14')
  })

  test('a calendar date renders as the same day whatever the server offset', ({ assert }) => {
    // `new Date('2026-08-03')` is UTC midnight and slides back a day in any
    // negative offset — a plain `YYYY-MM-DD` carries no instant (#452).
    assert.equal(formatDate('2026-08-03', 'fr'), '03/08/2026')
  })

  test('an unparsable value renders the placeholder, not "Invalid Date"', ({ assert }) => {
    assert.equal(formatDate('not-a-date', 'fr'), EMPTY_DATE)
  })
})
