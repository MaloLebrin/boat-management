import { describe, expect, test, vi } from 'vitest'

const mockLocale = { value: 'en' }

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: mockLocale.value } }),
}))

import { useDateFormat } from '../../inertia/composables/use_date_format'

describe('useDateFormat', () => {
  test('formatDate returns a non-empty string for an ISO date', () => {
    const { formatDate } = useDateFormat()
    const result = formatDate('2026-07-12')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  test('formatDate never returns the raw ISO string', () => {
    const { formatDate } = useDateFormat()
    expect(formatDate('2026-07-12')).not.toBe('2026-07-12')
  })

  test('formatDate includes the year', () => {
    const { formatDate } = useDateFormat()
    expect(formatDate('2026-07-12')).toContain('2026')
  })

  test('formatDate handles ISO datetime strings', () => {
    const { formatDate } = useDateFormat()
    const result = formatDate('2026-01-05T10:00:00.000Z')
    expect(typeof result).toBe('string')
    expect(result).toContain('2026')
  })

  test('formatDate returns an em dash for null/undefined', () => {
    const { formatDate } = useDateFormat()
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })

  test('formatDate follows the current locale', () => {
    mockLocale.value = 'fr'
    const { formatDate } = useDateFormat()
    expect(formatDate('2026-07-12')).toBe(
      new Date('2026-07-12').toLocaleDateString('fr', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    )
    mockLocale.value = 'en'
  })

  test('formatDateTime returns a non-empty string', () => {
    const { formatDateTime } = useDateFormat()
    const result = formatDateTime('2026-07-12T17:20:33.000Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  test('formatDateTime returns an em dash for null/undefined', () => {
    const { formatDateTime } = useDateFormat()
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime(undefined)).toBe('—')
  })
})
