import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}(${Object.values(params).join(',')})` : k,
    locale: { value: 'fr' },
  }),
}))

vi.mock('~/composables/use_notification_helpers', () => ({
  useNotificationHelpers: () => ({ formatRelativeTime: () => 'il y a 5 h' }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

import DashboardAtSeaCard from '../../inertia/components/dashboard/DashboardAtSeaCard.vue'
import type { DashboardActiveTrips, DashboardFleetStatus } from '../../shared/types/dashboard'

const stubs = {
  BaseButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
  QuickAddNavigationLogModal: {
    props: ['open', 'boats', 'portOptions'],
    template: '<div data-testid="log-modal" :data-open="open" :data-boats="boats.length" />',
  },
}

const fleet: DashboardFleetStatus = { total: 5, atSea: 2, inPort: 3, enginesInMaintenance: 1 }
const trips: DashboardActiveTrips = {
  total: 2,
  items: [
    {
      id: 1,
      boatId: 4,
      boatName: 'Albatros',
      departedAt: '2026-09-26T03:00:00.000Z',
      departurePortName: 'Brest',
      crewCount: 4,
    },
    {
      id: 2,
      boatId: 5,
      boatName: 'Marin du Vent',
      departedAt: '2026-09-26T05:00:00.000Z',
      departurePortName: null,
      crewCount: null,
    },
  ],
}

function mountCard(over: Partial<InstanceType<typeof DashboardAtSeaCard>['$props']> = {}) {
  return mount(DashboardAtSeaCard, {
    props: {
      activeTrips: trips,
      fleetStatus: fleet,
      boats: [
        {
          id: 4,
          name: 'Albatros',
          propulsionType: 'sail',
          enginesCount: 1,
          sailsCount: 2,
          hasRig: true,
        },
      ],
      portOptions: [],
      canCreateNavigationLogs: true,
      ...over,
    },
    global: { stubs },
  })
}

describe('DashboardAtSeaCard (#832)', () => {
  test('shows the fleet status line and one whole-row link per trip', async () => {
    const w = mountCard()
    await w.vm.$nextTick()
    expect(w.get('[data-testid="dashboard-fleet-status"]').text()).toBe(
      'dashboard.atSea.status(2,3,1)'
    )
    const rows = w.findAll('[data-testid="dashboard-active-trip-row"]')
    expect(rows.map((r) => r.attributes('href'))).toEqual([
      '/boats/4/navigation',
      '/boats/5/navigation',
    ])
    expect(rows[0].text()).toContain('dashboard.atSea.departedFrom(Brest)')
    expect(rows[0].text()).toContain('il y a 5 h')
    expect(rows[0].text()).toContain('dashboard.atSea.crew(4)')
    expect(rows[1].text()).toContain('dashboard.atSea.departed')
    expect(rows[1].text()).not.toContain('dashboard.atSea.crew')
    expect(w.get('[data-testid="dashboard-at-sea-view-all"]').attributes('href')).toBe(
      '/navigation/logbook'
    )
  })

  test('links to the logbook for trips beyond the display cap', () => {
    const w = mountCard({ activeTrips: { ...trips, total: 7 } })
    expect(w.text()).toContain('dashboard.atSea.viewMore(5)')
  })

  test('the empty state offers to log a trip, opening the quick-add modal', async () => {
    const w = mountCard({ activeTrips: { items: [], total: 0 } })
    expect(w.text()).toContain('dashboard.atSea.empty')
    const cta = w.get('[data-testid="dashboard-at-sea-cta"]')
    expect(w.get('[data-testid="log-modal"]').attributes('data-open')).toBe('false')
    await cta.trigger('click')
    expect(w.get('[data-testid="log-modal"]').attributes('data-open')).toBe('true')
    expect(w.get('[data-testid="log-modal"]').attributes('data-boats')).toBe('1')
  })

  test('hides the CTA and the modal without the create permission or without boats', () => {
    const denied = mountCard({
      activeTrips: { items: [], total: 0 },
      canCreateNavigationLogs: false,
    })
    expect(denied.find('[data-testid="dashboard-at-sea-cta"]').exists()).toBe(false)
    expect(denied.find('[data-testid="log-modal"]').exists()).toBe(false)

    const noBoats = mountCard({ activeTrips: { items: [], total: 0 }, boats: [] })
    expect(noBoats.find('[data-testid="dashboard-at-sea-cta"]').exists()).toBe(false)
  })
})
