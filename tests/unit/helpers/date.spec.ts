import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { toDateTime, toUtcFromLocalInput } from '#shared/helpers/date'

test.group('toDateTime', () => {
  test('interprets a naive ISO string as UTC (server-tz independent)', ({ assert }) => {
    assert.equal(toDateTime('2024-01-01T10:00').toUTC().toISO(), '2024-01-01T10:00:00.000Z')
  })

  test('re-labels a naive server-local Date as the same UTC wall-clock', ({ assert }) => {
    // Mirrors VineJS: a JS Date built from the naive wall-clock 10:00 in the
    // process's local zone. Whatever TZ the test runs under, the result must be
    // 10:00 UTC — this is what fails on a non-UTC server without the fix.
    const localDate = DateTime.fromObject({ year: 2024, month: 1, day: 1, hour: 10 }).toJSDate()
    const result = toDateTime(localDate).toUTC()
    assert.equal(result.hour, 10)
    assert.equal(result.toISO(), '2024-01-01T10:00:00.000Z')
  })

  test('keeps the instant of an offset-aware ISO string', ({ assert }) => {
    assert.equal(
      toDateTime('2024-01-01T10:00:00+02:00').toUTC().toISO(),
      '2024-01-01T08:00:00.000Z'
    )
  })

  test('returns an existing DateTime unchanged', ({ assert }) => {
    const dt = DateTime.utc(2024, 1, 1, 10)
    assert.strictEqual(toDateTime(dt), dt)
  })
})

test.group('toUtcFromLocalInput', () => {
  test('shifts a naive UTC+10 wall-clock to the instant the user meant', ({ assert }) => {
    // #452: "03/08/2026 15:19" typed on a UTC+10 machine. getTimezoneOffset()
    // returns -600 there, so the stored instant must be 05:19 UTC — displaying it
    // back in UTC+10 gives 15:19, not 01:19 the next day.
    assert.equal(
      toUtcFromLocalInput('2026-08-03T15:19', -600).toUTC().toISO(),
      '2026-08-03T05:19:00.000Z'
    )
  })

  test('shifts a naive UTC-5 wall-clock forward', ({ assert }) => {
    assert.equal(
      toUtcFromLocalInput('2026-08-03T15:19', 300).toUTC().toISO(),
      '2026-08-03T20:19:00.000Z'
    )
  })

  test('works on the server-local Date VineJS produces', ({ assert }) => {
    const localDate = DateTime.fromObject({
      year: 2026,
      month: 8,
      day: 3,
      hour: 15,
      minute: 19,
    }).toJSDate()

    assert.equal(toUtcFromLocalInput(localDate, -600).toUTC().toISO(), '2026-08-03T05:19:00.000Z')
  })

  test('falls back to the naive-as-UTC behaviour when no offset is sent', ({ assert }) => {
    // Offline replays and API callers may omit the field — they keep the old
    // semantics rather than being silently shifted.
    assert.equal(
      toUtcFromLocalInput('2026-08-03T15:19').toUTC().toISO(),
      '2026-08-03T15:19:00.000Z'
    )
    assert.equal(
      toUtcFromLocalInput('2026-08-03T15:19', null).toUTC().toISO(),
      '2026-08-03T15:19:00.000Z'
    )
  })
})
