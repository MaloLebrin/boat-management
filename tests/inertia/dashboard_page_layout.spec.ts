import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

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
import type { DashboardAttention } from '../../shared/types/dashboard'
import type { ResolvedDashboardLayout } from '../../shared/types/dashboard_layout'
import {
  ALL_WIDGETS_AVAILABLE,
  resolveDashboardLayout,
} from '../../shared/helpers/dashboard_layout'

/** Disposition par défaut d'un admin Entreprise (tout disponible), sauf `upcoming_reservations`. */
function defaultLayout(over: Partial<ResolvedDashboardLayout> = {}): ResolvedDashboardLayout {
  const layout = resolveDashboardLayout(null, {
    ...ALL_WIDGETS_AVAILABLE,
    upcoming_reservations: false,
  })
  return { ...layout, ...over }
}

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

/**
 * #828 — la page n'est plus qu'une orchestration : chaque bloc est stubé, on
 * vérifie l'ordre et la répartition en colonnes, pas le contenu des blocs.
 */
const stubs = {
  Head: { template: '<div><slot /></div>' },
  Link: { template: '<a><slot /></a>' },
  DashboardHeader: {
    template: '<div data-testid="header"><slot name="actions" /></div>',
  },
  DashboardQuickAddActions: { template: '<div data-testid="quick-add" />' },
  DashboardStatsGrid: { template: '<div data-testid="stats" />' },
  DashboardAttentionCard: {
    props: ['attention'],
    template: '<div data-testid="attention" :data-total="attention.counts.total" />',
  },
  DashboardBoatsCard: { template: '<div data-testid="boats" />' },
  DashboardAtSeaCard: { template: '<div data-testid="at-sea" />' },
  DashboardActivityCard: { template: '<div data-testid="activity" />' },
  DashboardSpendCard: { template: '<div data-testid="spend" />' },
  DashboardUpcomingReservationsCard: { template: '<div data-testid="upcoming" />' },
  DashboardAiPanel: { template: '<div data-testid="ai-panel" />' },
  PortDashboardCard: { template: '<div data-testid="ports" />' },
  DashboardPlannedTasksCard: { template: '<div data-testid="planned-tasks" />' },
  DashboardNotificationsCard: { template: '<div data-testid="notifications" />' },
  DashboardCustomizeModal: { template: '<div data-testid="customize-modal" />' },
}

function mountDashboard(currentPlan = 'enterprise', extraProps: Record<string, unknown> = {}) {
  vi.mocked(usePage).mockReturnValue({
    props: { currentPlan, activeModules: [], activeAddons: [] },
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
        urgentMaintenance: 7,
        deltas: { boatsInAlert: 0, overdueCount: 3 },
      },
      aiFleetAnalysis: null,
      ports: [],
      portStats: { total: 0, totalBoats: 0, totalFreeSpots: 0 },
      portOptions: [],
      canCreateNavigationLogs: false,
      canCreateIncidents: false,
      canCreateMaintenanceTasks: false,
      canAddBoat: true,
      boatQuota: { used: 0, limit: 2 },
      layout: defaultLayout(),
      ...extraProps,
    },
    global: { stubs },
  })
}

function order(wrapper: ReturnType<typeof mountDashboard>, ids: string[]) {
  const html = wrapper.html()
  return ids.map((id) => html.indexOf(`data-testid="${id}"`))
}

describe('Dashboard — structure de page (#828)', () => {
  test('stacks header, KPIs, then the two-column grid in that order', () => {
    const positions = order(mountDashboard(), ['header', 'stats', 'attention'])
    expect(positions.every((p) => p >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  test('orders the main column: attention, today grid (at sea), boats', () => {
    const wrapper = mountDashboard()
    const main = wrapper.get('[data-testid="dashboard-main-column"]')
    expect(main.find('[data-testid="attention"]').exists()).toBe(true)
    expect(main.find('[data-testid="at-sea"]').exists()).toBe(true)
    expect(main.find('[data-testid="boats"]').exists()).toBe(true)
    const positions = order(wrapper, ['attention', 'at-sea', 'activity', 'boats'])
    expect(positions.every((p) => p >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  test('the side column shows the spend card between the AI panel and the ports, admins only', () => {
    const admin = mountDashboard()
    const side = admin.get('[data-testid="dashboard-side-column"]')
    expect(side.find('[data-testid="spend"]').exists()).toBe(true)
    const [ai, spend, ports] = order(admin, ['ai-panel', 'spend', 'ports'])
    expect(ai).toBeLessThan(spend)
    expect(spend).toBeLessThan(ports)

    // Membre : le serveur retire `spend` de la disposition (widget indisponible).
    const member = mountDashboard('enterprise', {
      canViewSpend: false,
      layout: resolveDashboardLayout(null, {
        ...ALL_WIDGETS_AVAILABLE,
        upcoming_reservations: false,
        spend: false,
      }),
    })
    expect(member.find('[data-testid="spend"]').exists()).toBe(false)
  })

  test('« En mer » stands alone without the charter module and pairs with the departures with it', () => {
    const without = mountDashboard()
    expect(without.find('[data-testid="upcoming"]').exists()).toBe(false)
    expect(without.find('[data-testid="dashboard-half-row"]').exists()).toBe(false)

    const withModule = mountDashboard('enterprise', {
      upcomingReservations: [],
      layout: resolveDashboardLayout(null, ALL_WIDGETS_AVAILABLE),
    })
    expect(withModule.find('[data-testid="upcoming"]').exists()).toBe(true)
    const row = withModule.get('[data-testid="dashboard-half-row"]')
    expect(row.classes()).toContain('md:grid-cols-2')
    expect(row.find('[data-testid="at-sea"]').exists()).toBe(true)
    expect(row.find('[data-testid="upcoming"]').exists()).toBe(true)
    const [atSea, upcoming] = order(withModule, ['at-sea', 'upcoming'])
    expect(atSea).toBeLessThan(upcoming)
  })

  test('puts the AI panel then the ports card in the side column, after the main column', () => {
    const wrapper = mountDashboard()
    const side = wrapper.get('[data-testid="dashboard-side-column"]')
    expect(side.find('[data-testid="ai-panel"]').exists()).toBe(true)
    expect(side.find('[data-testid="ports"]').exists()).toBe(true)
    const [boats, ai, ports] = order(wrapper, ['boats', 'ai-panel', 'ports'])
    expect(boats).toBeLessThan(ai)
    expect(ai).toBeLessThan(ports)
  })

  test('closes the side column with the planned tasks and the notifications by default', () => {
    const wrapper = mountDashboard()
    const side = wrapper.get('[data-testid="dashboard-side-column"]')
    expect(side.find('[data-testid="planned-tasks"]').exists()).toBe(true)
    expect(side.find('[data-testid="notifications"]').exists()).toBe(true)
    const positions = order(wrapper, ['ports', 'planned-tasks', 'notifications'])
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  /**
   * Sans alignement explicite, `align-items: stretch` (défaut d'une grille)
   * étirerait la colonne latérale — donc le panneau navy de l'assistant — sur
   * toute la hauteur de la colonne principale.
   */
  test('the two-column grid does not stretch the side column', () => {
    const grid = mountDashboard().get('[data-testid="dashboard-side-column"]').element
      .parentElement!
    expect(grid.className).toContain('grid')
    expect(grid.className).toContain('xl:items-start')
    expect(grid.className).toContain('xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]')
  })

  test('follows a customised order and skips hidden widgets', () => {
    const wrapper = mountDashboard('enterprise', {
      layout: defaultLayout({
        order: {
          top: ['kpis'],
          main: ['boats', 'activity', 'attention', 'at_sea'],
          side: ['notifications', 'spend', 'ports', 'ai_panel', 'planned_tasks'],
        },
        hidden: ['kpis', 'activity', 'ports'],
        isCustomized: true,
      }),
    })

    expect(wrapper.find('[data-testid="stats"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="activity"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="ports"]').exists()).toBe(false)

    const main = order(wrapper, ['boats', 'attention', 'at-sea'])
    expect(main.every((p) => p >= 0)).toBe(true)
    expect(main).toEqual([...main].sort((a, b) => a - b))

    const side = order(wrapper, ['notifications', 'spend', 'ai-panel', 'planned-tasks'])
    expect(side.every((p) => p >= 0)).toBe(true)
    expect(side).toEqual([...side].sort((a, b) => a - b))

    expect(wrapper.get('[data-testid="dashboard-hidden-count"]').text()).toBe(
      'dashboard.customize.hiddenCount'
    )
  })

  test('offers the customize button in the header and mounts the modal', () => {
    const wrapper = mountDashboard()
    expect(
      wrapper.get('[data-testid="header"]').find('[data-testid="dashboard-customize"]').exists()
    ).toBe(true)
    expect(wrapper.find('[data-testid="dashboard-hidden-count"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="customize-modal"]').exists()).toBe(true)
  })

  test('hands the whole attention payload to the card', () => {
    const attention = mountDashboard().get('[data-testid="attention"]')
    expect(attention.attributes('data-total')).toBe('7')
  })

  test('renders no page-level alert and no ghost link to the fleet in the header', () => {
    const wrapper = mountDashboard()
    expect(wrapper.text()).not.toContain('dashboard.overdueAlert')
    expect(wrapper.text()).not.toContain('dashboard.subtitle')
    expect(wrapper.text()).not.toContain('nav.boats')
    expect(wrapper.get('[data-testid="header"]').find('[data-testid="quick-add"]').exists()).toBe(
      true
    )
  })
})
