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
    formatCurrency: (v: number) => `${v} €`,
    formatCurrencyNoDecimals: (v: number) => `${Math.round(v)} €`,
  }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

import DashboardFuelCard from '../../inertia/components/dashboard/DashboardFuelCard.vue'
import type { DashboardFuelSummary } from '../../shared/types/dashboard'

const fuel: DashboardFuelSummary = {
  windowDays: 30,
  liters: 640.5,
  cost: 1281,
  avgPricePerLiter: 2.001,
  fillUps: 4,
  previous: { liters: 500, cost: 950 },
  topBoat: { boatId: 4, boatName: 'Albatros', liters: 400 },
}

describe('DashboardFuelCard', () => {
  test('shows a skeleton while the deferred prop has not arrived', () => {
    const w = mount(DashboardFuelCard, { props: { fuel: undefined } })
    expect(w.find('[data-testid="dashboard-fuel-skeleton"]').exists()).toBe(true)
    expect(w.find('[data-testid="dashboard-fuel-liters"]').exists()).toBe(false)
  })

  test('renders the empty state without any fill-up', () => {
    const w = mount(DashboardFuelCard, {
      props: { fuel: { ...fuel, liters: 0, cost: 0, fillUps: 0, previous: null, topBoat: null } },
    })
    expect(w.find('[data-testid="dashboard-fuel-empty"]').exists()).toBe(true)
    expect(w.text()).toContain('dashboard.fuel.period(30)')
  })

  test('renders litres, the delta against the previous window, cost, price and top boat', () => {
    const w = mount(DashboardFuelCard, { props: { fuel } })
    expect(w.get('[data-testid="dashboard-fuel-liters"]').text()).toBe(
      'dashboard.fuel.liters(n:640.5)'
    )
    const delta = w.get('[data-testid="dashboard-fuel-delta"]')
    // 640,5 L vs 500 L : +28 %, en hausse → danger (même règle que « Dépenses »).
    expect(delta.text()).toContain('dashboard.fuel.increase(28)')
    expect(delta.find('.text-danger').exists()).toBe(true)
    expect(w.get('[data-testid="dashboard-fuel-cost"]').text()).toBe('1281 €')
    expect(w.get('[data-testid="dashboard-fuel-price"]').text()).toBe(
      'dashboard.fuel.perLiter(2.001 €)'
    )
    expect(w.text()).toContain('dashboard.fuel.fillUps(4)')
    const top = w.get('[data-testid="dashboard-fuel-top-boat"]')
    expect(top.attributes('href')).toBe('/boats/4')
    expect(top.text()).toBe('Albatros')
    expect(w.get('[data-testid="dashboard-fuel-view-all"]').attributes('href')).toBe(
      '/navigation/fuel'
    )
  })

  test('falls back when no comparison or no price is available', () => {
    const w = mount(DashboardFuelCard, {
      props: { fuel: { ...fuel, liters: 300, previous: null, avgPricePerLiter: null } },
    })
    expect(w.get('[data-testid="dashboard-fuel-delta"]').text()).toBe('dashboard.fuel.noComparison')
    expect(w.get('[data-testid="dashboard-fuel-price"]').text()).toBe('dashboard.fuel.noPrice')
  })

  test('a drop in consumption is shown as a success', () => {
    const w = mount(DashboardFuelCard, {
      props: { fuel: { ...fuel, liters: 250, previous: { liters: 500, cost: 900 } } },
    })
    const delta = w.get('[data-testid="dashboard-fuel-delta"]')
    expect(delta.text()).toContain('dashboard.fuel.decrease(50)')
    expect(delta.find('.text-success').exists()).toBe(true)
  })
})
