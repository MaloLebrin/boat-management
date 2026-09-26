import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}(${Object.values(params).join(',')})` : k,
    locale: { value: 'fr' },
  }),
}))

vi.mock('~/composables/use_number_format', () => ({
  useNumberFormat: () => ({
    formatNumber: (v: number) => `n:${v}`,
    formatCurrencyNoDecimals: (v: number) => `${v} €`,
  }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

import DashboardCharterOccupancyCard from '../../inertia/components/dashboard/DashboardCharterOccupancyCard.vue'
import type { DashboardCharterOccupancy } from '../../shared/types/dashboard'

const occupancy: DashboardCharterOccupancy = {
  windowDays: 30,
  boats: 4,
  occupancyRate: 42,
  reservedBoatDays: 50.5,
  confirmed: 6,
  options: 2,
  confirmedRevenue: 12400,
}

describe('DashboardCharterOccupancyCard', () => {
  test('shows a skeleton while the deferred prop has not arrived', () => {
    const w = mount(DashboardCharterOccupancyCard, { props: { charterOccupancy: undefined } })
    expect(w.find('[data-testid="dashboard-occupancy-skeleton"]').exists()).toBe(true)
    expect(w.find('[data-testid="dashboard-occupancy-rate"]').exists()).toBe(false)
  })

  test('renders the empty state without any reservation in the window', () => {
    const w = mount(DashboardCharterOccupancyCard, {
      props: {
        charterOccupancy: {
          ...occupancy,
          occupancyRate: 0,
          reservedBoatDays: 0,
          confirmed: 0,
          options: 0,
          confirmedRevenue: 0,
        },
      },
    })
    expect(w.find('[data-testid="dashboard-occupancy-empty"]').exists()).toBe(true)
    expect(w.text()).toContain('dashboard.charterOccupancy.period(30)')
  })

  test('renders the rate, the progress bar, the counts and the revenue', () => {
    const w = mount(DashboardCharterOccupancyCard, { props: { charterOccupancy: occupancy } })
    expect(w.get('[data-testid="dashboard-occupancy-rate"]').text()).toBe(
      'dashboard.charterOccupancy.rate(42)'
    )
    expect(w.get('[data-testid="dashboard-occupancy-bar"]').attributes('style')).toContain(
      'width: 42%'
    )
    expect(w.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('42')
    expect(w.text()).toContain('dashboard.charterOccupancy.boatDays(n:50.5,4)')
    expect(w.get('[data-testid="dashboard-occupancy-confirmed"]').text()).toBe('6')
    expect(w.get('[data-testid="dashboard-occupancy-options"]').text()).toBe('2')
    expect(w.get('[data-testid="dashboard-occupancy-revenue"]').text()).toBe('12400 €')
    expect(w.get('[data-testid="dashboard-occupancy-view-all"]').attributes('href')).toBe(
      '/reservations'
    )
  })
})
