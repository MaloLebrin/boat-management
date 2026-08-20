import { describe, expect, test } from 'vitest'
import {
  isoToDatetimeLocalValue,
  parseDisplayDate,
  toDatetimeLocalValue,
  tzOffsetMinutes,
} from '../../inertia/utils/local_datetime'

describe('toDatetimeLocalValue', () => {
  test('formats a Date as the naive local wall-clock', () => {
    expect(toDatetimeLocalValue(new Date(2026, 7, 3, 15, 19))).toBe('2026-08-03T15:19')
  })

  test('zero-pads month, day, hour and minute', () => {
    expect(toDatetimeLocalValue(new Date(2026, 0, 5, 9, 7))).toBe('2026-01-05T09:07')
  })
})

describe('isoToDatetimeLocalValue', () => {
  test('renders a stored UTC instant as the matching local wall-clock', () => {
    // #452: prefilling an edit form must show the user's own wall-clock, not the
    // raw UTC one — otherwise re-saving shifts the value by the offset again.
    const instant = new Date(2026, 7, 3, 15, 19).toISOString()
    expect(isoToDatetimeLocalValue(instant)).toBe('2026-08-03T15:19')
  })

  test('round-trips with toDatetimeLocalValue', () => {
    const date = new Date(2026, 11, 31, 23, 45)
    expect(isoToDatetimeLocalValue(date.toISOString())).toBe(toDatetimeLocalValue(date))
  })
})

describe('tzOffsetMinutes', () => {
  test('returns the browser offset the backend expects to add', () => {
    expect(tzOffsetMinutes()).toBe(new Date().getTimezoneOffset())
  })
})

describe('parseDisplayDate', () => {
  test('anchors a YYYY-MM-DD calendar date at local midnight', () => {
    // Not `new Date('2026-08-03')`, which is UTC midnight and slides to Aug 2 in
    // any negative offset (#452).
    const parsed = parseDisplayDate('2026-08-03')
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(7)
    expect(parsed.getDate()).toBe(3)
    expect(parsed.getHours()).toBe(0)
  })

  test('leaves a full ISO instant untouched', () => {
    const instant = '2026-08-03T05:19:00.000Z'
    expect(parseDisplayDate(instant).toISOString()).toBe(instant)
  })
})
