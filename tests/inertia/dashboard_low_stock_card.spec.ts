import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}(${Object.values(params).join(',')})` : k,
    locale: { value: 'fr' },
  }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

import DashboardLowStockCard from '../../inertia/components/dashboard/DashboardLowStockCard.vue'
import type { DashboardLowStockParts } from '../../shared/types/dashboard'

const lowStock: DashboardLowStockParts = {
  total: 8,
  lowStockCount: 5,
  toReplaceCount: 3,
  items: [
    {
      id: 1,
      boatId: 4,
      boatName: 'Albatros',
      engineId: 9,
      engineBrand: 'Yanmar',
      engineModel: '3YM30',
      engineKind: 'inboard',
      designation: 'Filtre à gasoil',
      reference: 'YM-104',
      stock: 0,
      minStockAlert: 2,
      wearState: 'good',
      reason: 'low_stock',
    },
    {
      id: 2,
      boatId: 5,
      boatName: 'Sirocco',
      engineId: 11,
      engineBrand: null,
      engineModel: null,
      engineKind: 'outboard',
      designation: 'Turbine',
      reference: null,
      stock: 3,
      minStockAlert: null,
      wearState: 'to_replace',
      reason: 'to_replace',
    },
  ],
}

describe('DashboardLowStockCard', () => {
  test('shows a skeleton while the deferred prop has not arrived', () => {
    const w = mount(DashboardLowStockCard, { props: { lowStock: undefined } })
    expect(w.find('[data-testid="dashboard-low-stock-skeleton"]').exists()).toBe(true)
    expect(w.find('[data-testid="dashboard-low-stock-chip-stock"]').exists()).toBe(false)
  })

  test('renders the empty state without any alert', () => {
    const w = mount(DashboardLowStockCard, {
      props: { lowStock: { items: [], total: 0, lowStockCount: 0, toReplaceCount: 0 } },
    })
    expect(w.find('[data-testid="dashboard-low-stock-empty"]').exists()).toBe(true)
    expect(w.find('[data-testid="dashboard-low-stock-more"]').exists()).toBe(false)
  })

  test('renders the chips, one linked row per part with its badge, and the remaining count', () => {
    const w = mount(DashboardLowStockCard, { props: { lowStock } })
    expect(w.get('[data-testid="dashboard-low-stock-chip-stock"]').text()).toBe(
      'dashboard.lowStock.lowStockChip(5)'
    )
    expect(w.get('[data-testid="dashboard-low-stock-chip-replace"]').text()).toBe(
      'dashboard.lowStock.toReplaceChip(3)'
    )
    const rows = w.findAll('[data-testid="dashboard-low-stock-row"]')
    expect(rows.map((r) => r.attributes('href'))).toEqual([
      '/boats/4/engines/9?tab=parts',
      '/boats/5/engines/11?tab=parts',
    ])
    expect(rows[0].text()).toContain('Filtre à gasoil')
    expect(rows[0].text()).toContain('YM-104')
    expect(rows[0].text()).toContain('Albatros · Yanmar 3YM30')
    expect(rows[0].get('[data-testid="dashboard-low-stock-badge"]').text()).toBe(
      'dashboard.lowStock.stock(0,2)'
    )
    // Sans marque ni modèle, le moteur est nommé par son type traduit.
    expect(rows[1].text()).toContain('Sirocco · boats.options.engineKind.outboard')
    expect(rows[1].get('[data-testid="dashboard-low-stock-badge"]').text()).toBe(
      'boats.options.partWearState.to_replace'
    )
    expect(w.get('[data-testid="dashboard-low-stock-more"]').text()).toBe(
      'dashboard.lowStock.more(6)'
    )
    expect(w.get('[data-testid="dashboard-low-stock-view-all"]').attributes('href')).toBe(
      '/spare-parts'
    )
  })
})
