import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { toDateTime } from '#shared/helpers/date'

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
