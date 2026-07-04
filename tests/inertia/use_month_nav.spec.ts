import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { test, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr-FR' } }),
}))

import { useMonthNav } from '../../inertia/composables/use_month_nav'

function mountComposable() {
  let result: ReturnType<typeof useMonthNav> | undefined

  mount(
    defineComponent({
      setup() {
        result = useMonthNav()
        return {}
      },
      template: '<div />',
    })
  )

  return result!
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-03-15'))
})

afterEach(() => {
  vi.useRealTimers()
})

test('currentYear is initialized from system time', () => {
  const { currentYear } = mountComposable()
  expect(currentYear.value).toBe(2026)
})

test('currentMonth is initialized from system time (0-indexed, March = 2)', () => {
  const { currentMonth } = mountComposable()
  expect(currentMonth.value).toBe(2)
})

test('nextMonth increments month', () => {
  const { currentMonth, nextMonth } = mountComposable()
  nextMonth()
  expect(currentMonth.value).toBe(3)
})

test('prevMonth decrements month', () => {
  const { currentMonth, prevMonth } = mountComposable()
  prevMonth()
  expect(currentMonth.value).toBe(1)
})

test('nextMonth wraps December to January and increments year', () => {
  vi.setSystemTime(new Date('2026-12-15'))
  const { currentMonth, currentYear, nextMonth } = mountComposable()
  expect(currentMonth.value).toBe(11)
  nextMonth()
  expect(currentMonth.value).toBe(0)
  expect(currentYear.value).toBe(2027)
})

test('prevMonth wraps January to December and decrements year', () => {
  vi.setSystemTime(new Date('2026-01-15'))
  const { currentMonth, currentYear, prevMonth } = mountComposable()
  expect(currentMonth.value).toBe(0)
  prevMonth()
  expect(currentMonth.value).toBe(11)
  expect(currentYear.value).toBe(2025)
})

test('daysInMonth is 31 for March 2026', () => {
  // System time is 2026-03-15 → March
  const { daysInMonth } = mountComposable()
  expect(daysInMonth.value).toBe(31)
})

test('daysInMonth is 29 for February 2024 (leap year)', () => {
  vi.setSystemTime(new Date('2024-02-10'))
  const { daysInMonth } = mountComposable()
  expect(daysInMonth.value).toBe(29)
})

test('daysInMonth is 28 for February 2026 (non-leap year)', () => {
  vi.setSystemTime(new Date('2026-02-10'))
  const { daysInMonth } = mountComposable()
  expect(daysInMonth.value).toBe(28)
})

test('firstWeekday is Monday-based (0=Monday) for March 2026', () => {
  // 2026-03-01 is a Sunday, which is 6 in Monday-based indexing
  const { firstWeekday } = mountComposable()
  expect(firstWeekday.value).toBe(6)
})

test('firstWeekday is 0 (Monday) for a month starting on Monday', () => {
  // 2024-01-01 is a Monday
  vi.setSystemTime(new Date('2024-01-15'))
  const { firstWeekday } = mountComposable()
  expect(firstWeekday.value).toBe(0)
})

test('isToday returns true for the mocked today day', () => {
  // System time is 2026-03-15 (day 15)
  const { isToday } = mountComposable()
  expect(isToday(15)).toBe(true)
})

test('isToday returns false for a different day', () => {
  const { isToday } = mountComposable()
  expect(isToday(14)).toBe(false)
  expect(isToday(16)).toBe(false)
})

test('isToday returns false when on a different month', () => {
  const { isToday, nextMonth } = mountComposable()
  nextMonth()
  // Now viewing April 2026, day 15 should not be "today" (we're still in March)
  expect(isToday(15)).toBe(false)
})

test('monthLabel is a non-empty string', () => {
  const { monthLabel } = mountComposable()
  expect(typeof monthLabel.value).toBe('string')
  expect(monthLabel.value.length).toBeGreaterThan(0)
})

test('weekdays has 7 entries', () => {
  const { weekdays } = mountComposable()
  expect(weekdays.value).toHaveLength(7)
})
