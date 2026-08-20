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

  test('boats and urgent maintenance cards stay visible alongside the empty state', () => {
    const w = mountGrid(makeStats())
    expect(w.text()).toContain('dashboard.stats.boats')
    expect(w.text()).toContain('dashboard.stats.urgentMaintenance')
  })

  test('as soon as one equipment type exists, the three individual cards are shown', () => {
    const w = mountGrid(makeStats({ engines: 2, deltas: makeStats().deltas }))

    expect(w.find('[data-testid="equipment-empty-card"]').exists()).toBe(false)
    expect(w.text()).toContain('dashboard.stats.engines')
    expect(w.text()).toContain('dashboard.stats.sails')
    expect(w.text()).toContain('dashboard.stats.rigs')
  })
})
