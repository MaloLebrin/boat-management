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

import DashboardInvoicingCard from '../../inertia/components/dashboard/DashboardInvoicingCard.vue'
import type { DashboardInvoicingSummary } from '../../shared/types/dashboard'

const invoicing: DashboardInvoicingSummary = {
  outstandingTotal: 4200,
  outstandingCount: 3,
  overdueTotal: 1200,
  overdueCount: 1,
  paidThisMonthTotal: 8600,
  paidThisMonthCount: 5,
  pendingQuotes: 2,
}

describe('DashboardInvoicingCard', () => {
  test('shows a skeleton while the deferred prop has not arrived', () => {
    const w = mount(DashboardInvoicingCard, { props: { invoicing: undefined } })
    expect(w.find('[data-testid="dashboard-invoicing-skeleton"]').exists()).toBe(true)
    expect(w.findAll('[data-testid="dashboard-invoicing-tile"]').length).toBe(0)
  })

  test('renders the empty state when nothing is in progress', () => {
    const w = mount(DashboardInvoicingCard, {
      props: {
        invoicing: {
          outstandingTotal: 0,
          outstandingCount: 0,
          overdueTotal: 0,
          overdueCount: 0,
          paidThisMonthTotal: 0,
          paidThisMonthCount: 0,
          pendingQuotes: 0,
        },
      },
    })
    expect(w.find('[data-testid="dashboard-invoicing-empty"]').exists()).toBe(true)
  })

  test('renders four linked tiles, the overdue one in danger', () => {
    const w = mount(DashboardInvoicingCard, { props: { invoicing } })
    const tiles = w.findAll('[data-testid="dashboard-invoicing-tile"]')
    expect(tiles.map((tile) => tile.attributes('href'))).toEqual([
      '/invoices?status=sent',
      '/invoices?status=overdue',
      '/invoices?status=paid',
      '/invoices?kind=quote',
    ])
    expect(tiles[0].text()).toContain('4200 €')
    expect(tiles[0].text()).toContain('dashboard.invoicing.count(3)')
    expect(tiles[1].text()).toContain('1200 €')
    expect(tiles[1].find('.text-danger').exists()).toBe(true)
    expect(tiles[2].find('.text-danger').exists()).toBe(false)
    // Les devis sont un simple compteur, sans montant.
    expect(tiles[3].text()).toContain('2')
    expect(tiles[3].text()).not.toContain('dashboard.invoicing.count')
    expect(w.get('[data-testid="dashboard-invoicing-view-all"]').attributes('href')).toBe(
      '/invoices'
    )
  })

  test('keeps the overdue tile neutral when nothing is overdue', () => {
    const w = mount(DashboardInvoicingCard, {
      props: { invoicing: { ...invoicing, overdueTotal: 0, overdueCount: 0 } },
    })
    const overdue = w.findAll('[data-testid="dashboard-invoicing-tile"]')[1]
    expect(overdue.find('.text-danger').exists()).toBe(false)
  })
})
