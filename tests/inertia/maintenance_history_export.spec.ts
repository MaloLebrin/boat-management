import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
  router: { get: vi.fn(), visit: vi.fn() },
}))

import MaintenanceHistory from '../../inertia/pages/maintenance/history.vue'

const baseFilters = {
  q: '',
  subject: '' as const,
  boatId: null,
  dateFrom: '',
  dateTo: '',
  sort: 'recent' as const,
  page: 1,
  perPage: 20,
}

const baseProps = {
  events: { data: [], meta: { total: 0, perPage: 20, currentPage: 1, lastPage: 1 } },
  stats: { totalEvents: 0, totalParts: 0, totalBoats: 0, totalCost: null },
  boatOptions: [],
}

describe('maintenance/history — export PDF (#362)', () => {
  test('links to /maintenance/history.pdf carrying the active filters', () => {
    const wrapper = mount(MaintenanceHistory, {
      props: {
        ...baseProps,
        filters: { ...baseFilters, subject: 'engine', boatId: 7, q: 'huile' },
        canExport: true,
      } as never,
    })

    const link = wrapper
      .findAll('a')
      .find((a) => a.attributes('href')?.includes('/maintenance/history.pdf'))
    expect(link).toBeDefined()
    const href = link!.attributes('href')!
    expect(href).toContain('subject=engine')
    expect(href).toContain('boatId=7')
    expect(href).toContain('q=huile')
    expect(link!.attributes('target')).toBe('_blank')
  })

  test('hides the export link when the plan does not allow exports', () => {
    const wrapper = mount(MaintenanceHistory, {
      props: { ...baseProps, filters: baseFilters, canExport: false } as never,
    })

    const link = wrapper
      .findAll('a')
      .find((a) => a.attributes('href')?.includes('/maintenance/history.pdf'))
    expect(link).toBeUndefined()
  })
})
