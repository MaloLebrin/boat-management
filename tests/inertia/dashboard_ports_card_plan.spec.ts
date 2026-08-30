import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDate: (v: string) => v }),
}))

vi.mock('@inertiajs/vue3', () => ({
  Head: { template: '<div><slot /></div>' },
  usePage: vi.fn(),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a><slot /></a>' },
}))

import { usePage } from '@inertiajs/vue3'
import Dashboard from '../../inertia/pages/dashboard.vue'
import type { DashboardPortItem } from '../../shared/types/dashboard'

const PORT: DashboardPortItem = {
  id: 1,
  name: 'Port-la-Forêt',
  city: 'Concarneau',
  country: 'FR',
  boatCount: 2,
  totalSpots: 10,
  freeSpots: 8,
}

const stubs = {
  Head: { template: '<div><slot /></div>' },
  Link: { template: '<a><slot /></a>' },
  BaseAlert: { template: '<div><slot /></div>' },
  BaseButton: { template: '<button><slot /></button>' },
  BaseCard: { template: '<div><slot name="header" /><slot /></div>' },
  DashboardAiPanel: { template: '<div />' },
  DashboardQuickAddActions: { template: '<div />' },
  DashboardStatsGrid: { template: '<div />' },
  NewBoatButton: { template: '<div />' },
  PortDashboardCard: { template: '<div class="port-dashboard-card" />' },
}

function mountDashboard(currentPlan: unknown, ports: DashboardPortItem[] = [PORT]) {
  vi.mocked(usePage).mockReturnValue({
    props: { currentPlan, activeModules: [], activeAddons: [] },
  } as unknown as ReturnType<typeof usePage>)

  return mount(Dashboard, {
    props: {
      boats: [],
      urgentMaintenance: [],
      stats: {
        boats: 0,
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
      },
      aiFleetAnalysis: null,
      ports,
      portStats: { total: ports.length, totalBoats: 2, totalFreeSpots: 8 },
      portOptions: [],
      canCreateNavigationLogs: false,
      canCreateIncidents: false,
      canAddBoat: true,
      boatQuota: { used: 0, limit: 2 },
    },
    global: { stubs },
  })
}

// #604 — la carte ports du dashboard suit la même garde de plan que la nav et
// les routes : sur Starter, son état vide inviterait à créer un port inaccessible.

test('le plan Pro affiche la carte ports du dashboard', () => {
  const wrapper = mountDashboard('pro')
  expect(wrapper.find('.port-dashboard-card').exists()).toBe(true)
})

test('le plan Entreprise affiche la carte ports du dashboard', () => {
  const wrapper = mountDashboard('enterprise')
  expect(wrapper.find('.port-dashboard-card').exists()).toBe(true)
})

test('le plan Starter masque la carte ports du dashboard', () => {
  const wrapper = mountDashboard('starter')
  expect(wrapper.find('.port-dashboard-card').exists()).toBe(false)
})

test('un plan absent masque la carte ports du dashboard', () => {
  const wrapper = mountDashboard(null)
  expect(wrapper.find('.port-dashboard-card').exists()).toBe(false)
})

test('le plan Pro sans aucun port affiche quand même la carte et son état vide', () => {
  const wrapper = mountDashboard('pro', [])
  expect(wrapper.find('.port-dashboard-card').exists()).toBe(true)
})
