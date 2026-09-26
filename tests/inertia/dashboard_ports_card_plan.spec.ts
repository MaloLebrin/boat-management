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
  router: { put: vi.fn(), delete: vi.fn() },
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a><slot /></a>' },
}))

import { usePage } from '@inertiajs/vue3'
import Dashboard from '../../inertia/pages/dashboard.vue'
import type { DashboardAttention, DashboardPortItem } from '../../shared/types/dashboard'
import {
  ALL_WIDGETS_AVAILABLE,
  resolveDashboardLayout,
} from '../../shared/helpers/dashboard_layout'

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
  DashboardActivityCard: { template: '<div />' },
  DashboardSpendCard: { template: '<div />' },
  DashboardUpcomingReservationsCard: { template: '<div />' },
  DashboardPlannedTasksCard: { template: '<div />' },
  DashboardNotificationsCard: { template: '<div />' },
  DashboardAddWidgetModal: { template: '<div />' },
  DashboardHeader: { template: '<div><slot name="actions" /></div>' },
  DashboardQuickAddActions: { template: '<div />' },
  DashboardStatsGrid: { template: '<div />' },
  DashboardAttentionCard: { template: '<div />' },
  PortDashboardCard: { template: '<div class="port-dashboard-card" />' },
}

/**
 * La garde de plan / profil de la carte ports (#604) est désormais tranchée
 * côté serveur : `DashboardLayoutService.availabilityFor` retire `ports` de la
 * disposition servie (voir `tests/functional/dashboard/dashboard_layout.spec.ts`).
 * La page ne fait que rendre la disposition reçue — `usePage()` n'entre plus en jeu.
 */
function mountDashboard(portsAvailable: boolean, ports: DashboardPortItem[] = [PORT]) {
  vi.mocked(usePage).mockReturnValue({
    props: { currentPlan: 'enterprise', activeModules: [], activeAddons: [] },
  } as unknown as ReturnType<typeof usePage>)

  return mount(Dashboard, {
    props: {
      boats: [],
      attention: EMPTY_ATTENTION,
      pulse: { windowDays: 30, tripsCompleted: 0, distanceNm: 0, tasksDone: 0 },
      activeTrips: { items: [], total: 0 },
      fleetStatus: { total: 0, atSea: 0, inPort: 0, enginesInMaintenance: 0 },
      canViewSpend: true,
      aiFleetAnalysisAt: null,
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
      layout: resolveDashboardLayout(null, { ...ALL_WIDGETS_AVAILABLE, ports: portsAvailable }),
    },
    global: { stubs },
  })
}

test('une disposition sans `ports` (plan ou profil sans cartographie) masque la carte', () => {
  const wrapper = mountDashboard(false)
  expect(wrapper.find('.port-dashboard-card').exists()).toBe(false)
})

test('une disposition avec `ports` affiche la carte', () => {
  const wrapper = mountDashboard(true)
  expect(wrapper.find('.port-dashboard-card').exists()).toBe(true)
})

test('sans aucun port, la carte reste rendue avec son état vide', () => {
  const wrapper = mountDashboard(true, [])
  expect(wrapper.find('.port-dashboard-card').exists()).toBe(true)
})

test('un widget `ports` masqué par l’utilisateur n’est pas rendu', () => {
  const layout = resolveDashboardLayout(
    { version: 1, order: { main: [], side: [] }, hidden: ['ports'] },
    ALL_WIDGETS_AVAILABLE
  )
  vi.mocked(usePage).mockReturnValue({
    props: { currentPlan: 'enterprise', activeModules: [], activeAddons: [] },
  } as unknown as ReturnType<typeof usePage>)
  const wrapper = mountDashboard(true)
  expect(wrapper.find('.port-dashboard-card').exists()).toBe(true)
  const hidden = mount(Dashboard, {
    props: { ...(wrapper.props() as Record<string, unknown>), layout },
    global: { stubs },
  })
  expect(hidden.find('.port-dashboard-card').exists()).toBe(false)
})
