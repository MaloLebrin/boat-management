import { describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

import { useReservationFormat } from '../../inertia/composables/use_reservation_format'

describe('useReservationFormat', () => {
  test('formatDate returns a non-empty string', () => {
    const { formatDate } = useReservationFormat()
    const result = formatDate('2026-06-15')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  test('formatDate includes the year', () => {
    const { formatDate } = useReservationFormat()
    expect(formatDate('2026-06-15')).toContain('2026')
  })

  test('formatDate handles ISO datetime strings', () => {
    const { formatDate } = useReservationFormat()
    const result = formatDate('2026-01-05T10:00:00.000Z')
    expect(typeof result).toBe('string')
    expect(result).toContain('2026')
  })
})
