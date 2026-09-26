import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    template: '<a data-inertia-link :href="href"><slot /></a>',
    props: ['href'],
  },
}))

import DashboardStatsGrid from '../../inertia/components/dashboard/DashboardStatsGrid.vue'
import type { DashboardStats } from '../../shared/types/dashboard'

function makeStats(overrides: Partial<DashboardStats> = {}): DashboardStats {
  return {
    boats: 3,
    engines: 0,
    sails: 0,
    rigs: 0,
    urgentMaintenance: 0,
    deltas: {
      boatsInAlert: 0,
      boatsWithEngine: 0,
      boatsWithSail: 0,
      boatsWithRig: 0,
      overdueCount: 0,
    },
    ...overrides,
  }
}

function mountGrid(stats: DashboardStats) {
  return mount(DashboardStatsGrid, { props: { stats } })
}

describe('DashboardStatsGrid — combined equipment empty state (#419)', () => {
  test('with no equipment at all, the three grey cards collapse into one CTA card', () => {
    const w = mountGrid(makeStats())

    expect(w.find('[data-testid="equipment-empty-card"]').exists()).toBe(true)
    expect(w.text()).toContain('dashboard.stats.equipmentEmpty.description')
    expect(w.text()).not.toContain('dashboard.stats.engines')
    expect(w.text()).not.toContain('dashboard.stats.sails')
    expect(w.text()).not.toContain('dashboard.stats.rigs')
  })

  test('the CTA is an Inertia link to /boats', () => {
    const w = mountGrid(makeStats())
    const cta = w.findAll('a').find((a) => a.text().includes('dashboard.stats.equipmentEmpty.cta'))
    expect(cta).toBeDefined()
    expect(cta!.attributes('data-inertia-link')).toBeDefined()
    expect(cta!.attributes('href')).toBe('/boats')
  })

  test('the boats card stays visible alongside the empty state', () => {
    const w = mountGrid(makeStats())
    expect(w.text()).toContain('dashboard.stats.boats')
  })

  test('as soon as one equipment type exists, the three individual cards are shown', () => {
    const w = mountGrid(makeStats({ engines: 2, deltas: makeStats().deltas }))

    expect(w.find('[data-testid="equipment-empty-card"]').exists()).toBe(false)
    expect(w.text()).toContain('dashboard.stats.engines')
    expect(w.text()).toContain('dashboard.stats.sails')
    expect(w.text()).toContain('dashboard.stats.rigs')
  })
})

describe('DashboardStatsGrid — 4 KPI compacts (#828)', () => {
  const full = makeStats({
    engines: 2,
    sails: 1,
    rigs: 1,
    deltas: { ...makeStats().deltas, boatsWithEngine: 2, boatsWithSail: 1, boatsWithRig: 1 },
  })

  test('renders four cards: boats + three equipment, no urgent maintenance KPI', () => {
    const w = mountGrid(full)
    expect(w.findAll('a').length).toBe(4)
    expect(w.text()).not.toContain('dashboard.stats.urgentMaintenance')
    expect(w.text()).not.toContain('dashboard.stats.delta.overdue')
    expect(w.text()).not.toContain('dashboard.stats.delta.noOverdue')
  })

  test('lays the cards out two per row below lg and four per row from lg', () => {
    const grid = mountGrid(full).find('div')
    expect(grid.classes()).toContain('grid-cols-2')
    expect(grid.classes()).toContain('lg:grid-cols-4')
    expect(grid.classes()).not.toContain('grid-cols-1')
    expect(grid.classes()).not.toContain('lg:grid-cols-5')
  })

  test('the boats card carries no badge when the fleet is up to date', () => {
    const w = mountGrid(full)
    expect(w.text()).not.toContain('common.tone.info')
    expect(w.text()).not.toContain('common.tone.neutral')
    expect(w.text()).toContain('dashboard.stats.delta.boatsOk')
  })

  test('the boats card turns to warning when boats are in alert', () => {
    const w = mountGrid(makeStats({ ...full, deltas: { ...full.deltas, boatsInAlert: 2 } }))
    expect(w.text()).toContain('common.tone.warning')
    expect(w.text()).toContain('dashboard.stats.delta.boatsInAlert')
  })

  test('the combined empty card spans both mobile columns', () => {
    const card = mountGrid(makeStats()).get('[data-testid="equipment-empty-card"]')
    expect(card.classes()).toContain('col-span-2')
    expect(card.classes()).toContain('lg:col-span-3')
  })
})
