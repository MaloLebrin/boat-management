import { DateTime } from 'luxon'

/**
 * Normalises a datetime input to a UTC Luxon DateTime, so the result does not
 * depend on the server's local timezone (prod runs in UTC, dev machines don't).
 *
 * Naive datetimes (no offset — e.g. `2024-01-01T10:00` from a `datetime-local`
 * input) are treated as UTC wall-clock:
 *   - `Date` values coming from VineJS are parsed in the server's local zone, so
 *     we recover that wall-clock and re-label it as UTC (`keepLocalTime`);
 *   - naive ISO strings are parsed directly as UTC.
 * A datetime that carries an explicit offset keeps its instant.
 */
export function toDateTime(value: Date | string | DateTime): DateTime {
  if (DateTime.isDateTime(value)) return value
  if (value instanceof Date) {
    return DateTime.fromJSDate(value).setZone('utc', { keepLocalTime: true })
  }
  return DateTime.fromISO(String(value), { zone: 'utc' })
}

/**
 * Converts a naive `datetime-local` submission into the UTC instant the user
 * actually meant.
 *
 * `toDateTime` re-labels the wall-clock as UTC, which is only correct for a
 * browser sitting in UTC. Every other timezone would store (and later display)
 * the value shifted by its offset — see #452. The browser sends its
 * `Date#getTimezoneOffset()` alongside the field, which is already the number of
 * minutes to add to local wall-clock to reach UTC (e.g. `-600` for UTC+10), so
 * the correction is a plain addition.
 *
 * `tzOffsetMinutes` is optional on purpose: older clients, offline replays and
 * API callers that post an absolute datetime simply get the previous behaviour.
 */
export function toUtcFromLocalInput(
  value: Date | string | DateTime,
  tzOffsetMinutes?: number | null
): DateTime {
  return toDateTime(value).plus({ minutes: tzOffsetMinutes ?? 0 })
}
