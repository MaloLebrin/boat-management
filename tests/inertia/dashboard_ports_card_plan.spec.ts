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
import type { DashboardAttention } from '../../shared/types/dashboard'

const EMPTY_ATTENTION: DashboardAttention = {
  items: [],
  counts: {
    maintenanceOverdue: 3,
    maintenanceSoon: 4,
    incidentsOpen: 0,
    incidentsInProgress: 0,
    documentsExpired: 0,
    documentsExpiring: 0,
    invoicesOverdue: 0,
    total: 7,
  },
  canViewInvoices: false,
}
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
  DashboardAiPanel: { template: '<div />' },
  DashboardBoatsCard: { template: '<div />' },
  DashboardAtSeaCard: { template: '<div />' },
  DashboardUpcomingReservationsCard: { template: '<div />' },
  DashboardHeader: { template: '<div><slot name="actions" /></div>' },
  DashboardQuickAddActions: { template: '<div />' },
  DashboardStatsGrid: { template: '<div />' },
  DashboardAttentionCard: { template: '<div />' },
  PortDashboardCard: { template: '<div class="port-dashboard-card" />' },
}

function mountDashboard(
  currentPlan: unknown,
  ports: DashboardPortItem[] = [PORT],
  organizationType: unknown = undefined
) {
  vi.mocked(usePage).mockReturnValue({
    props: { currentPlan, activeModules: [], activeAddons: [], organizationType },
  } as unknown as ReturnType<typeof usePage>)

  return mount(Dashboard, {
    props: {
      boats: [],
      attention: EMPTY_ATTENTION,
      pulse: { windowDays: 30, tripsCompleted: 0, distanceNm: 0, tasksDone: 0 },
      activeTrips: { items: [], total: 0 },
      fleetStatus: { total: 0, atSea: 0, inPort: 0, enginesInMaintenance: 0 },
      stats: {
        boats: 0,
        engines: 0,
        sails: 0,
        rigs: 0,
        urgentMaintenance: 0,
        deltas: { boatsInAlert: 0, overdueCount: 0 },
      },
      aiFleetAnalysis: null,
      ports,
      portStats: { total: ports.length, totalBoats: 2, totalFreeSpots: 8 },
      portOptions: [],
      canCreateNavigationLogs: false,
      canCreateIncidents: false,
      canCreateMaintenanceTasks: false,
      canAddBoat: true,
      boatQuota: { used: 0, limit: 2 },
    },
    global: { stubs },
  })
}

// #604 — la carte ports du dashboard suit la même garde de plan que la nav et
// les routes : hors Entreprise, son état vide inviterait à créer un port
// inaccessible.

test('le plan Pro masque la carte ports du dashboard', () => {
  const wrapper = mountDashboard('pro')
  expect(wrapper.find('.port-dashboard-card').exists()).toBe(false)
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

test('le plan Entreprise sans aucun port affiche quand même la carte et son état vide', () => {
  const wrapper = mountDashboard('enterprise', [])
  expect(wrapper.find('.port-dashboard-card').exists()).toBe(true)
})

test('the ports card is hidden for a private organization profile', () => {
  const wrapper = mountDashboard('enterprise', [PORT], 'private')
  expect(wrapper.find('.port-dashboard-card').exists()).toBe(false)
})

test('the ports card stays visible for a professional profile', () => {
  const wrapper = mountDashboard('enterprise', [PORT], 'marina')
  expect(wrapper.find('.port-dashboard-card').exists()).toBe(true)
})
