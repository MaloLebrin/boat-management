import { describe, expect, test } from 'vitest'

import {
  EMPTY_DATE,
  formatDate,
  formatDateLong,
  formatDateTime,
  formatDayMonth,
  formatMonthYear,
  formatTime,
  formatWeekdayDay,
  formatWeekdayShort,
  parseDisplayDate,
  resolveLocaleTag,
} from '../../shared/helpers/date_format'

// #461: the same locale used to render dates three different ways. These tests
// pin the canonical output of each style so a screen cannot drift again.
describe('resolveLocaleTag', () => {
  test('maps the app locales to explicit BCP 47 tags', () => {
    expect(resolveLocaleTag('fr')).toBe('fr-FR')
    expect(resolveLocaleTag('en')).toBe('en-US')
  })

  test('accepts a regional variant and keeps the app tag', () => {
    expect(resolveLocaleTag('fr-CA')).toBe('fr-FR')
    expect(resolveLocaleTag('EN-GB')).toBe('en-US')
  })

  test('falls back to en for an unknown or missing locale', () => {
    expect(resolveLocaleTag('de')).toBe('en-US')
    expect(resolveLocaleTag(null)).toBe('en-US')
    expect(resolveLocaleTag(undefined)).toBe('en-US')
  })
})

describe('parseDisplayDate', () => {
  test('anchors a YYYY-MM-DD calendar date at local midnight (#452)', () => {
    const date = parseDisplayDate('2026-08-03')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(7)
    expect(date.getDate()).toBe(3)
  })

  test('keeps a full ISO instant as an instant', () => {
    expect(parseDisplayDate('2026-01-05T10:00:00.000Z').toISOString()).toBe(
      '2026-01-05T10:00:00.000Z'
    )
  })

  test('passes a Date through untouched', () => {
    const date = new Date(2026, 6, 15)
    expect(parseDisplayDate(date)).toBe(date)
  })
})

describe('date styles', () => {
  const DAY = '2026-07-15'

  test('formatDate renders the numeric style of each locale', () => {
    expect(formatDate(DAY, 'fr')).toBe('15/07/2026')
    expect(formatDate(DAY, 'en')).toBe('07/15/2026')
  })

  test('formatDate is stable whichever locale casing or variant is passed', () => {
    expect(formatDate(DAY, 'fr-CA')).toBe(formatDate(DAY, 'fr'))
  })

  test('formatDateLong spells the month out', () => {
    expect(formatDateLong(DAY, 'fr')).toBe('15 juillet 2026')
    expect(formatDateLong(DAY, 'en')).toBe('July 15, 2026')
  })

  test('formatDayMonth drops the year', () => {
    expect(formatDayMonth(DAY, 'fr')).toBe('15 juil.')
    expect(formatDayMonth(DAY, 'en')).toBe('Jul 15')
  })

  test('formatMonthYear renders a month header', () => {
    expect(formatMonthYear(DAY, 'fr')).toBe('juillet 2026')
    expect(formatMonthYear(DAY, 'en')).toBe('July 2026')
  })

  test('formatWeekdayDay renders an agenda label', () => {
    expect(formatWeekdayDay(DAY, 'fr')).toBe('mer. 15')
    expect(formatWeekdayDay(DAY, 'en')).toBe('Wed 15')
  })

  test('formatWeekdayShort caps the weekday at three capitalised letters', () => {
    // January 1st 2024 is a Monday.
    const monday = new Date(2024, 0, 1)
    expect(formatWeekdayShort(monday, 'fr')).toBe('Lun')
    expect(formatWeekdayShort(monday, 'en')).toBe('Mon')
  })

  test('formatDateTime keeps the date numeric and never shows seconds', () => {
    const instant = new Date(2026, 6, 15, 15, 14, 34)
    expect(formatDateTime(instant, 'fr')).toBe('15/07/2026 15:14')
    expect(formatDateTime(instant, 'en')).toBe('07/15/2026, 03:14 PM')
  })

  test('formatTime renders the time of day alone', () => {
    const instant = new Date(2026, 6, 15, 15, 14)
    expect(formatTime(instant, 'fr')).toBe('15:14')
    expect(formatTime(instant, 'en')).toBe('03:14 PM')
  })

  test('every style falls back to the app locale when none is passed', () => {
    expect(formatDate(DAY)).toBe(formatDate(DAY, 'en'))
  })

  test('an unparsable value renders the empty placeholder instead of "Invalid Date"', () => {
    expect(formatDate('not-a-date', 'fr')).toBe(EMPTY_DATE)
    expect(formatDateTime('not-a-date', 'en')).toBe(EMPTY_DATE)
  })
})
