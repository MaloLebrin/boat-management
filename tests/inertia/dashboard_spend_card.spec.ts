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

import DashboardSpendCard from '../../inertia/components/dashboard/DashboardSpendCard.vue'
import type { DashboardSpendSummary } from '../../shared/types/dashboard'
import type { BudgetYearSummary } from '../../shared/types/budget'

const totals = (over: Partial<BudgetYearSummary>): BudgetYearSummary => ({
  maintenance: 0,
  fuel: 0,
  documents: 0,
  port: 0,
  equipment: 0,
  entries: 0,
  total: 0,
  ...over,
})

const spend: DashboardSpendSummary = {
  year: 2026,
  throughMonth: 9,
  totals: totals({ maintenance: 5000, fuel: 3000, port: 2000, total: 10000 }),
  previousYearToDate: totals({ total: 8000 }),
  singleBoatId: null,
}

describe('DashboardSpendCard (#832)', () => {
  test('shows a skeleton while the deferred prop has not arrived', () => {
    const w = mount(DashboardSpendCard, { props: { spend: undefined } })
    expect(w.find('[data-testid="dashboard-spend-skeleton"]').exists()).toBe(true)
    expect(w.find('[data-testid="dashboard-spend-total"]').exists()).toBe(false)
  })

  test('renders the total, the year-over-year delta and one bar per non-zero category, largest first', () => {
    const w = mount(DashboardSpendCard, { props: { spend } })
    expect(w.get('[data-testid="dashboard-spend-total"]').text()).toBe('10000 €')
    const delta = w.get('[data-testid="dashboard-spend-delta"]')
    expect(delta.text()).toContain('dashboard.spend.increase(25)')
    expect(delta.text()).toContain('dashboard.spend.vsSamePeriod(2025)')
    expect(delta.find('.text-danger').exists()).toBe(true)

    const bars = w.findAll('[data-testid="dashboard-spend-bar"]')
    expect(bars.map((b) => b.attributes('data-category'))).toEqual(['maintenance', 'fuel', 'port'])
    expect(bars.map((b) => b.attributes('data-percent'))).toEqual(['50', '30', '20'])
    expect(w.text()).toContain('budget.categories.maintenance')
    expect(w.find('[data-testid="dashboard-spend-link"]').exists()).toBe(false)
  })

  test('a decrease reads as success and a single-boat fleet links to its budget', () => {
    const w = mount(DashboardSpendCard, {
      props: {
        spend: {
          ...spend,
          totals: totals({ fuel: 600, total: 600 }),
          previousYearToDate: totals({ total: 800 }),
          singleBoatId: 7,
        },
      },
    })
    const delta = w.get('[data-testid="dashboard-spend-delta"]')
    expect(delta.text()).toContain('dashboard.spend.decrease(25)')
    expect(delta.find('.text-success').exists()).toBe(true)
    expect(w.get('[data-testid="dashboard-spend-link"]').attributes('href')).toBe('/boats/7/budget')
  })

  test('without last-year spend it says so, and without any spend shows the empty line', () => {
    const w = mount(DashboardSpendCard, {
      props: { spend: { ...spend, totals: totals({}), previousYearToDate: null } },
    })
    expect(w.get('[data-testid="dashboard-spend-delta"]').text()).toBe(
      'dashboard.spend.noComparison'
    )
    expect(w.text()).toContain('dashboard.spend.empty')
    expect(w.findAll('[data-testid="dashboard-spend-bar"]').length).toBe(0)
  })
})
