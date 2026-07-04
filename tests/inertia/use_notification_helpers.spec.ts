import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { test, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

import { useNotificationHelpers } from '../../inertia/composables/use_notification_helpers'
import type { NotificationSeverity } from '../../shared/types/notification'

function mountComposable() {
  let result: ReturnType<typeof useNotificationHelpers> | undefined

  mount(
    defineComponent({
      setup() {
        result = useNotificationHelpers()
        return {}
      },
      template: '<div />',
    })
  )

  return result!
}

const NOW = new Date('2026-07-04T12:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

function isoMinutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60 * 1000).toISOString()
}

function isoHoursAgo(hours: number): string {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000).toISOString()
}

function isoDaysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

// formatRelativeTime — threshold tests

test('formatRelativeTime returns justNow key when less than 1 minute ago', () => {
  const { formatRelativeTime } = mountComposable()
  const result = formatRelativeTime(isoMinutesAgo(0))
  expect(result).toBe('notifications.time.justNow')
})

test('formatRelativeTime returns justNow key at exactly 0 seconds ago', () => {
  const { formatRelativeTime } = mountComposable()
  const result = formatRelativeTime(NOW.toISOString())
  expect(result).toBe('notifications.time.justNow')
})

test('formatRelativeTime returns minutesAgo key when 1 minute ago', () => {
  const { formatRelativeTime } = mountComposable()
  const result = formatRelativeTime(isoMinutesAgo(1))
  expect(result).toBe('notifications.time.minutesAgo')
})

test('formatRelativeTime returns minutesAgo key when 30 minutes ago', () => {
  const { formatRelativeTime } = mountComposable()
  const result = formatRelativeTime(isoMinutesAgo(30))
  expect(result).toBe('notifications.time.minutesAgo')
})

test('formatRelativeTime returns minutesAgo key when 59 minutes ago', () => {
  const { formatRelativeTime } = mountComposable()
  const result = formatRelativeTime(isoMinutesAgo(59))
  expect(result).toBe('notifications.time.minutesAgo')
})

test('formatRelativeTime returns hoursAgo key at exactly 60 minutes ago', () => {
  const { formatRelativeTime } = mountComposable()
  const result = formatRelativeTime(isoMinutesAgo(60))
  expect(result).toBe('notifications.time.hoursAgo')
})

test('formatRelativeTime returns hoursAgo key when 2 hours ago', () => {
  const { formatRelativeTime } = mountComposable()
  const result = formatRelativeTime(isoHoursAgo(2))
  expect(result).toBe('notifications.time.hoursAgo')
})

test('formatRelativeTime returns hoursAgo key when 23 hours ago', () => {
  const { formatRelativeTime } = mountComposable()
  const result = formatRelativeTime(isoHoursAgo(23))
  expect(result).toBe('notifications.time.hoursAgo')
})

test('formatRelativeTime returns daysAgo key at exactly 24 hours ago', () => {
  const { formatRelativeTime } = mountComposable()
  const result = formatRelativeTime(isoHoursAgo(24))
  expect(result).toBe('notifications.time.daysAgo')
})

test('formatRelativeTime returns daysAgo key when 2 days ago', () => {
  const { formatRelativeTime } = mountComposable()
  const result = formatRelativeTime(isoDaysAgo(2))
  expect(result).toBe('notifications.time.daysAgo')
})

// getSeverityClasses tests

test('getSeverityClasses returns blue classes for info', () => {
  const { getSeverityClasses } = mountComposable()
  expect(getSeverityClasses('info')).toBe('bg-blue-100 text-blue-600')
})

test('getSeverityClasses returns green classes for success', () => {
  const { getSeverityClasses } = mountComposable()
  expect(getSeverityClasses('success')).toBe('bg-green-100 text-green-600')
})

test('getSeverityClasses returns orange classes for warning', () => {
  const { getSeverityClasses } = mountComposable()
  expect(getSeverityClasses('warning')).toBe('bg-orange-100 text-orange-600')
})

test('getSeverityClasses returns red classes for error', () => {
  const { getSeverityClasses } = mountComposable()
  expect(getSeverityClasses('error')).toBe('bg-red-100 text-red-600')
})

test('getSeverityClasses returns gray classes for unknown severity', () => {
  const { getSeverityClasses } = mountComposable()
  // Cast to NotificationSeverity to simulate an unknown value at runtime
  expect(getSeverityClasses('unknown' as NotificationSeverity)).toBe('bg-gray-100 text-gray-600')
})
