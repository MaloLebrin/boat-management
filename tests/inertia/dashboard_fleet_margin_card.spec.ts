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
  useNumberFormat: () => ({ formatCurrencyNoDecimals: (v: number) => `${v} €` }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

import DashboardFleetMarginCard from '../../inertia/components/dashboard/DashboardFleetMarginCard.vue'
import type { DashboardFleetMargin } from '../../shared/types/reporting'

const margin: DashboardFleetMargin = {
  period: { preset: 'month', from: '2026-06-01', to: '2026-06-30', days: 30 },
  rentalRevenue: 500,
  costs: 700,
  margin: -200,
  previousMargin: 460,
  topCostBoat: { id: 3, name: 'Albatros', costs: 650 },
}

describe('DashboardFleetMarginCard (#887)', () => {
  test('shows a skeleton while the deferred prop has not arrived', () => {
    const w = mount(DashboardFleetMarginCard, { props: { fleetMargin: undefined } })
    expect(w.find('[data-testid="dashboard-margin-skeleton"]').exists()).toBe(true)
  })

  test('shows the margin, flags a loss and names the most expensive boat', () => {
    const w = mount(DashboardFleetMarginCard, { props: { fleetMargin: margin } })
    const value = w.find('[data-testid="dashboard-margin-value"]')
    expect(value.text()).toBe('-200 €')
    expect(value.classes()).toContain('text-danger')
    expect(w.text()).toContain('dashboard.fleetMargin.previous(460 €)')
    expect(w.find('[data-testid="dashboard-margin-top-boat"]').text()).toBe(
      'dashboard.fleetMargin.topBoat(Albatros,650 €)'
    )
    expect(w.find('[data-testid="dashboard-margin-view-all"]').attributes('href')).toBe('/reports')
  })

  test('an empty month says so instead of showing zeros', () => {
    const w = mount(DashboardFleetMarginCard, {
      props: {
        fleetMargin: { ...margin, costs: 0, rentalRevenue: 0, margin: 0, topCostBoat: null },
      },
    })
    expect(w.find('[data-testid="dashboard-margin-empty"]').exists()).toBe(true)
  })
})
