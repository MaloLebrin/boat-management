import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}(${Object.values(params).join(',')})` : k,
  }),
}))

vi.mock('~/composables/use_number_format', () => ({
  useNumberFormat: () => ({ formatNumber: (v: number) => String(v) }),
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

import DashboardStatsGrid from '../../inertia/components/dashboard/DashboardStatsGrid.vue'
import type {
  DashboardAttentionCounts,
  DashboardFleetStatus,
  DashboardPulseStats,
  DashboardStats,
} from '../../shared/types/dashboard'

function mountGrid(
  over: {
    stats?: Partial<DashboardStats>
    pulse?: Partial<DashboardPulseStats>
    fleetStatus?: Partial<DashboardFleetStatus>
    counts?: Partial<DashboardAttentionCounts>
  } = {}
) {
  return mount(DashboardStatsGrid, {
    props: {
      stats: {
        boats: 5,
        engines: 5,
        sails: 6,
        rigs: 3,
        urgentMaintenance: 10,
        deltas: { boatsInAlert: 0, overdueCount: 0 },
        ...over.stats,
      },
      pulse: { windowDays: 30, tripsCompleted: 0, distanceNm: 0, tasksDone: 0, ...over.pulse },
      fleetStatus: { total: 5, atSea: 2, inPort: 3, enginesInMaintenance: 1, ...over.fleetStatus },
      counts: {
        maintenanceOverdue: 0,
        maintenanceSoon: 0,
        incidentsOpen: 0,
        incidentsInProgress: 0,
        documentsExpired: 0,
        documentsExpiring: 0,
        invoicesOverdue: 0,
        total: 0,
        ...over.counts,
      },
    },
  })
}

describe('DashboardStatsGrid — 4 KPI « pulse » (#832)', () => {
  test('renders four linked cards: boats, trips, tasks done, open incidents', () => {
    const w = mountGrid()
    const links = w.findAll('a')
    expect(links.map((a) => a.attributes('href'))).toEqual([
      '/boats',
      '/navigation/logbook',
      '/planning',
      '/navigation/incidents',
    ])
    expect(w.text()).toContain('dashboard.stats.tripsWindow(30)')
    expect(w.text()).toContain('dashboard.stats.tasksDoneWindow(30)')
    expect(w.text()).not.toContain('dashboard.stats.engines')
    expect(w.text()).not.toContain('dashboard.stats.urgentMaintenance')
    expect(w.find('[data-testid="equipment-empty-card"]').exists()).toBe(false)
  })

  test('lays the cards out two per row below lg and four per row from lg', () => {
    const grid = mountGrid().find('div')
    expect(grid.classes()).toContain('grid-cols-2')
    expect(grid.classes()).toContain('lg:grid-cols-4')
  })

  test('the boats card shows at-sea and alert counts, warning only when boats are in alert', () => {
    const quiet = mountGrid().get('[data-testid="dashboard-kpi-boats"]')
    expect(quiet.text()).toContain('dashboard.stats.delta.atSeaAndAlert(2,0)')
    expect(quiet.text()).not.toContain('common.tone')

    const alert = mountGrid({ stats: { deltas: { boatsInAlert: 2, overdueCount: 0 } } }).get(
      '[data-testid="dashboard-kpi-boats"]'
    )
    expect(alert.text()).toContain('common.tone.warning')
  })

  test('the trips card shows the distance sailed, or an explicit empty delta', () => {
    const sailed = mountGrid({ pulse: { tripsCompleted: 12, distanceNm: 184.5 } }).get(
      '[data-testid="dashboard-kpi-trips"]'
    )
    expect(sailed.text()).toContain('12')
    expect(sailed.text()).toContain('dashboard.stats.delta.distance(184.5)')

    const none = mountGrid().get('[data-testid="dashboard-kpi-trips"]')
    expect(none.text()).toContain('dashboard.stats.delta.noTrips')
  })

  test('the tasks card turns to warning with the overdue count', () => {
    const w = mountGrid({
      pulse: { tasksDone: 9 },
      stats: { deltas: { boatsInAlert: 1, overdueCount: 3 } },
    })
    const card = w.get('[data-testid="dashboard-kpi-tasks"]')
    expect(card.text()).toContain('9')
    expect(card.text()).toContain('dashboard.stats.delta.tasksOverdue(3)')
    expect(card.text()).toContain('common.tone.warning')
    expect(mountGrid().get('[data-testid="dashboard-kpi-tasks"]').text()).toContain(
      'dashboard.stats.delta.tasksUpToDate'
    )
  })

  test('the incidents card counts open incidents and details those in progress', () => {
    const w = mountGrid({ counts: { incidentsOpen: 2, incidentsInProgress: 1 } })
    const card = w.get('[data-testid="dashboard-kpi-incidents"]')
    expect(card.text()).toContain('2')
    expect(card.text()).toContain('dashboard.stats.delta.incidentsInProgress(1)')
    expect(card.text()).toContain('common.tone.warning')

    const openOnly = mountGrid({ counts: { incidentsOpen: 2 } }).get(
      '[data-testid="dashboard-kpi-incidents"]'
    )
    expect(openOnly.text()).toContain('dashboard.stats.delta.incidentsAllOpen')

    const none = mountGrid().get('[data-testid="dashboard-kpi-incidents"]')
    expect(none.text()).toContain('dashboard.stats.delta.noIncidents')
    expect(none.text()).not.toContain('common.tone')
  })
})
