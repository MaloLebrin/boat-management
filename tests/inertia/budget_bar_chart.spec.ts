import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import BudgetBarChart from '../../inertia/components/boats/budget/BudgetBarChart.vue'
import type { BudgetMonthlyData } from '../../shared/types/budget'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('~/composables/use_currency_format', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (v: number) => `${v.toFixed(2)} €`,
    formatCurrencyNoDecimals: (v: number) => `${Math.round(v)} €`,
  }),
}))

vi.mock('vue-chartjs', () => ({
  Bar: { template: '<canvas />' },
}))

function makeEmptyMonthly(): BudgetMonthlyData[] {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    maintenance: 0,
    fuel: 0,
    documents: 0,
    port: 0,
    equipment: 0,
    entries: 0,
    total: 0,
  }))
}

test('shows noData message when all months have zero total', () => {
  const w = mount(BudgetBarChart, { props: { monthly: makeEmptyMonthly() } })
  expect(w.text()).toContain('budget.chart.noData')
})

test('renders Bar chart when there is data', () => {
  const monthly = makeEmptyMonthly()
  monthly[0].maintenance = 500
  monthly[0].total = 500

  const w = mount(BudgetBarChart, { props: { monthly } })
  expect(w.find('canvas').exists()).toBe(true)
  expect(w.text()).not.toContain('budget.chart.noData')
})

test('renders chart title', () => {
  const w = mount(BudgetBarChart, { props: { monthly: makeEmptyMonthly() } })
  expect(w.text()).toContain('budget.chart.title')
})
