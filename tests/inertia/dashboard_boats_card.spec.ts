import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

/**
 * #828 — « Vos bateaux » suit le motif #493 : cartes `lg:hidden` + table
 * `hidden lg:block`, mêmes données des deux côtés, plus de scroll horizontal
 * forcé par un `min-w`.
 */

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

import DashboardBoatsCard from '../../inertia/components/dashboard/DashboardBoatsCard.vue'
import type { DashboardBoatSummary } from '../../shared/types/dashboard'

const BOATS: DashboardBoatSummary[] = [
  {
    id: 1,
    name: 'Bora Bora',
    propulsionType: 'sail',
    enginesCount: 1,
    sailsCount: 2,
    hasRig: true,
  },
  {
    id: 2,
    name: 'Sirocco',
    propulsionType: 'motor',
    enginesCount: 2,
    sailsCount: 0,
    hasRig: false,
  },
]

function mountCard(boats = BOATS) {
  return mount(DashboardBoatsCard, { props: { boats } })
}

describe('DashboardBoatsCard (#828)', () => {
  test('renders both the mobile cards block and the desktop table block', () => {
    const w = mountCard()
    const cards = w.find('.lg\\:hidden.space-y-3')
    const table = w.find('.hidden.lg\\:block table')
    expect(cards.exists()).toBe(true)
    expect(table.exists()).toBe(true)
  })

  test('renders one card per boat, linking to the boat page', () => {
    const cards = mountCard().findAll('[data-testid="dashboard-boat-card"]')
    expect(cards.length).toBe(2)
    expect(cards[0].attributes('href')).toBe('/boats/1')
    expect(cards[1].attributes('href')).toBe('/boats/2')
  })

  test('cards carry the same data as the table rows', () => {
    const w = mountCard()
    const card = w.findAll('[data-testid="dashboard-boat-card"]')[0]
    expect(card.text()).toContain('Bora Bora')
    expect(card.text()).toContain('dashboard.yourBoats.columns.engines 1')
    expect(card.text()).toContain('dashboard.yourBoats.columns.sails 2')
    expect(card.text()).toContain('common.yes')

    const row = w.findAll('tbody tr')[0]
    expect(row.text()).toContain('Bora Bora')
    expect(row.findAll('td')[2].text()).toBe('1')
    expect(row.findAll('td')[3].text()).toBe('2')
    expect(row.findAll('td')[4].text()).toContain('common.yes')
  })

  test('the table no longer forces a minimum width', () => {
    const table = mountCard().get('table')
    expect(table.classes().some((c) => c.startsWith('min-w-'))).toBe(false)
    expect(table.classes()).toContain('w-full')
  })

  test('renders the empty state in both blocks', () => {
    const w = mountCard([])
    expect(w.find('.lg\\:hidden').text()).toContain('dashboard.yourBoats.empty')
    expect(w.find('tbody').text()).toContain('dashboard.yourBoats.empty')
    expect(w.findAll('[data-testid="dashboard-boat-card"]').length).toBe(0)
  })

  test('the header links to the fleet with a touch-friendly target', () => {
    const link = mountCard().get('[data-testid="dashboard-view-all"]')
    expect(link.attributes('href')).toBe('/boats')
    expect(link.classes()).toContain('min-h-11')
    expect(link.text()).toContain('dashboard.yourBoats.viewAll')
  })
})
