import { test } from '@japa/runner'
import HomeController from '#controllers/home_controller'
import { ALL_WIDGETS_AVAILABLE, resolveDashboardLayout } from '#shared/helpers/dashboard_layout'
import type {
  DashboardWidgetAvailability,
  StoredDashboardLayout,
} from '#shared/types/dashboard_layout'

/** Disposition stockée injectée dans le test « authenticated » ; `null` = défaut. */
let storedLayout: StoredDashboardLayout | null = null

test.group('HomeController (unit)', () => {
  test('renders home when unauthenticated', async ({ assert }) => {
    const controller = new HomeController(
      {
        getForUser: async () => {
          throw new Error('should not be called')
        },
      } as any,
      {
        getLatestFleetAnalysis: async (_userId: number, _orgId: number, _locale: string) => null,
      } as any,
      {
        listNamesForOrg: async () => [],
      } as any,
      {
        getPlanningForOrg: async () => {
          throw new Error('should not be called')
        },
      } as any,
      {
        getBoatUsage: async () => ({ used: 0, limit: 2 }),
      } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {
        availabilityFor: async () => {
          throw new Error('should not be called')
        },
      } as any,
      {} as any,
      {} as any
    )

    const rendered: Array<{ component: string; props: any }> = []

    await controller.index({
      inertia: {
        render: (component: string, props: any) => {
          rendered.push({ component, props })
          return { component, props }
        },
      },
      auth: {
        isAuthenticated: false,
        check: async () => {},
      },
      i18n: { locale: 'en' },
    } as any)

    assert.equal(rendered[0]!.component, 'home')
  })

  test('renders dashboard when authenticated', async ({ assert }) => {
    const controller = new HomeController(
      {
        getForUser: async () => ({
          boats: [],
          urgentMaintenance: [],
          stats: { boats: 0, engines: 0, sails: 0, rigs: 0, urgentMaintenance: 0 },
        }),
      } as any,
      {
        getLatestFleetAnalysis: async (_userId: number, _orgId: number, _locale: string) => null,
      } as any,
      {
        listNamesForOrg: async () => [],
      } as any,
      {
        getPlanningForOrg: async () => {
          throw new Error('should not be called')
        },
      } as any,
      {
        getBoatUsage: async () => ({ used: 1, limit: 2 }),
        canManageInvoices: async () => false,
        canManageReservations: async () => false,
      } as any,
      {} as any,
      {
        getForUser: async () => ({
          items: [],
          counts: {
            maintenanceOverdue: 0,
            maintenanceSoon: 0,
            incidentsOpen: 0,
            incidentsInProgress: 0,
            documentsExpired: 0,
            documentsExpiring: 0,
            invoicesOverdue: 0,
            total: 0,
          },
          canViewInvoices: false,
        }),
      } as any,
      {
        getActiveTrips: async () => ({ items: [], total: 0 }),
        getFleetStatus: async () => ({ total: 0, atSea: 0, inPort: 0, enginesInMaintenance: 0 }),
        getPulse: async () => ({ windowDays: 30, tripsCompleted: 0, distanceNm: 0, tasksDone: 0 }),
        getRecentActivity: async () => [],
      } as any,
      {
        listUpcomingForOrg: async () => {
          throw new Error('should not be called without the charter module')
        },
      } as any,
      {
        getOrgSpendSummary: async () => {
          throw new Error('should not be called for a member')
        },
      } as any,
      {
        availabilityFor: async () => ({
          ...ALL_WIDGETS_AVAILABLE,
          upcoming_reservations: false,
          spend: false,
          ports: false,
        }),
        resolveForUser: (_user: unknown, availability: DashboardWidgetAvailability) =>
          resolveDashboardLayout(storedLayout, availability),
      } as any,
      {
        getDashboardSummary: async () => {
          throw new Error('default-hidden widget: should not be called')
        },
      } as any,
      {
        listAlertsForBoats: async () => {
          throw new Error('default-hidden widget: should not be called')
        },
      } as any
    )

    const rendered: Array<{ component: string; props: any }> = []

    await controller.index({
      inertia: {
        render: (component: string, props: any) => {
          rendered.push({ component, props })
          return { component, props }
        },
        optional: (fn: unknown) => fn,
        defer: (fn: unknown, group: string) => ({ deferred: group, fn }),
      },
      request: { qs: () => ({}) },
      auth: {
        isAuthenticated: true,
        check: async () => {},
        getUserOrFail: () => ({
          id: 1,
          organizationId: 42,
          organization: { id: 42, plan: 'starter' },
          load: async () => {},
          hasPermission: async () => true,
          getEffectiveRoleInOrg: async () => 'member',
        }),
      },
      i18n: { locale: 'en' },
    } as any)

    assert.equal(rendered[0]!.component, 'dashboard')
    assert.equal(rendered[0]!.props.canAddBoat, true)
    assert.deepEqual(rendered[0]!.props.boatQuota, { used: 1, limit: 2 })
    // Les lignes urgentes brutes ne sont plus une prop de page : « À traiter » les porte (#832)
    assert.notProperty(rendered[0]!.props, 'urgentMaintenance')
    assert.equal(rendered[0]!.props.attention.counts.total, 0)
    assert.equal(rendered[0]!.props.fleetStatus.total, 0)
    assert.notProperty(rendered[0]!.props, 'upcomingReservations')
    // Membre : pas de groupe différé « spend » ; l'activité est différée pour tous
    assert.isFalse(rendered[0]!.props.canViewSpend)
    assert.notProperty(rendered[0]!.props, 'spend')
    assert.equal(rendered[0]!.props.activity.deferred, 'activity')
    assert.equal(rendered[0]!.props.plannedTasks.deferred, 'plannedTasks')
    assert.isNull(rendered[0]!.props.aiFleetAnalysisAt)
    // Disposition par défaut, sans les widgets indisponibles (dépenses, ports)
    assert.isFalse(rendered[0]!.props.layout.isCustomized)
    assert.deepEqual(rendered[0]!.props.layout.order.side, [
      'ai_panel',
      'planned_tasks',
      'notifications',
      'safety_compliance',
      'fuel',
      'low_stock',
      'invoicing',
      'charter_occupancy',
    ])
    // Widgets de la galerie : masqués par défaut, donc ni calculés ni envoyés.
    assert.deepEqual(rendered[0]!.props.layout.hidden, [
      'safety_compliance',
      'fuel',
      'low_stock',
      'invoicing',
      'charter_occupancy',
    ])
    for (const prop of ['safetyCompliance', 'fuel', 'lowStock', 'invoicing', 'charterOccupancy']) {
      assert.notProperty(rendered[0]!.props, prop)
    }
  })

  test('defers the gallery widgets once the user has added them', async ({ assert }) => {
    storedLayout = {
      version: 1,
      order: {
        main: ['attention', 'at_sea', 'activity', 'boats'],
        side: [
          'fuel',
          'safety_compliance',
          'low_stock',
          'invoicing',
          'charter_occupancy',
          'ai_panel',
          'planned_tasks',
          'notifications',
        ],
      },
      hidden: [],
    }
    try {
      const controller = new HomeController(
        {
          getForUser: async () => ({
            boats: [],
            boatIds: [7],
            urgentMaintenance: [],
            stats: { boats: 1, engines: 0, sails: 0, rigs: 0, urgentMaintenance: 0 },
            ports: [],
            portStats: { total: 0, totalBoats: 0, totalFreeSpots: 0 },
          }),
          getSafetyCompliance: async () => ({
            checked: 0,
            compliant: 0,
            withIssues: 0,
            withoutZone: 1,
            items: [],
          }),
        } as any,
        { getLatestFleetAnalysis: async () => null } as any,
        { listNamesForOrg: async () => [] } as any,
        {} as any,
        { getBoatUsage: async () => ({ used: 1, limit: null }) } as any,
        {} as any,
        {
          getForUser: async () => ({ items: [], counts: { total: 0 }, canViewInvoices: true }),
        } as any,
        {
          getActiveTrips: async () => ({ items: [], total: 0 }),
          getFleetStatus: async () => ({ total: 1, atSea: 0, inPort: 1, enginesInMaintenance: 0 }),
          getPulse: async () => ({
            windowDays: 30,
            tripsCompleted: 0,
            distanceNm: 0,
            tasksDone: 0,
          }),
          getRecentActivity: async () => [],
          getFuelSummary: async () => ({ liters: 0 }),
        } as any,
        {
          listUpcomingForOrg: async () => [],
          getOccupancyForOrg: async () => ({ occupancyRate: 0 }),
        } as any,
        { getOrgSpendSummary: async () => ({}) } as any,
        {
          availabilityFor: async () => ({ ...ALL_WIDGETS_AVAILABLE, ports: false }),
          resolveForUser: (_user: unknown, availability: DashboardWidgetAvailability) =>
            resolveDashboardLayout(storedLayout, availability),
        } as any,
        { getDashboardSummary: async () => ({ pendingQuotes: 0 }) } as any,
        { listAlertsForBoats: async () => ({ items: [], total: 0 }) } as any
      )

      const rendered: Array<{ component: string; props: any }> = []
      await controller.index({
        inertia: {
          render: (component: string, props: any) => {
            rendered.push({ component, props })
            return { component, props }
          },
          optional: (fn: unknown) => fn,
          defer: (fn: unknown, group: string) => ({ deferred: group, fn }),
        },
        request: { qs: () => ({}) },
        auth: {
          isAuthenticated: true,
          check: async () => {},
          getUserOrFail: () => ({
            id: 1,
            organizationId: 42,
            organization: { id: 42, plan: 'enterprise' },
            load: async () => {},
            hasPermission: async () => true,
            getEffectiveRoleInOrg: async () => 'admin',
          }),
        },
        i18n: { locale: 'en' },
      } as any)

      const props = rendered[0]!.props
      assert.deepEqual(props.layout.hidden, [])
      assert.equal(props.safetyCompliance.deferred, 'safetyCompliance')
      assert.equal(props.fuel.deferred, 'fuel')
      assert.equal(props.lowStock.deferred, 'lowStock')
      assert.equal(props.invoicing.deferred, 'invoicing')
      assert.equal(props.charterOccupancy.deferred, 'charterOccupancy')
      // Les callbacks différés délèguent bien aux services (jamais `null`, #478).
      assert.deepEqual(await props.fuel.fn(), { liters: 0 })
      assert.deepEqual(await props.invoicing.fn(), { pendingQuotes: 0 })
      // `canViewInvoices` vient désormais de la disponibilité du widget « Facturation ».
      assert.isTrue(props.attention.canViewInvoices)
    } finally {
      storedLayout = null
    }
  })

  test('omits the deferred props of hidden widgets', async ({ assert }) => {
    storedLayout = {
      version: 1,
      order: { main: ['boats', 'attention'], side: ['notifications'] },
      hidden: ['activity', 'planned_tasks'],
    }
    try {
      const controller = new HomeController(
        {
          getForUser: async () => ({
            boats: [],
            boatIds: [],
            urgentMaintenance: [],
            stats: { boats: 0, engines: 0, sails: 0, rigs: 0, urgentMaintenance: 0 },
            ports: [],
            portStats: { total: 0, totalBoats: 0, totalFreeSpots: 0 },
          }),
        } as any,
        { getLatestFleetAnalysis: async () => null } as any,
        { listNamesForOrg: async () => [] } as any,
        {} as any,
        {
          getBoatUsage: async () => ({ used: 0, limit: 2 }),
          canManageInvoices: async () => false,
          canManageReservations: async () => false,
        } as any,
        {} as any,
        {
          getForUser: async () => ({
            items: [],
            counts: {
              maintenanceOverdue: 0,
              maintenanceSoon: 0,
              incidentsOpen: 0,
              incidentsInProgress: 0,
              documentsExpired: 0,
              documentsExpiring: 0,
              invoicesOverdue: 0,
              total: 0,
            },
            canViewInvoices: false,
          }),
        } as any,
        {
          getActiveTrips: async () => ({ items: [], total: 0 }),
          getFleetStatus: async () => ({ total: 0, atSea: 0, inPort: 0, enginesInMaintenance: 0 }),
          getPulse: async () => ({
            windowDays: 30,
            tripsCompleted: 0,
            distanceNm: 0,
            tasksDone: 0,
          }),
          getRecentActivity: async () => {
            throw new Error('hidden widget: should not be called')
          },
        } as any,
        {} as any,
        {} as any,
        {
          availabilityFor: async () => ({
            ...ALL_WIDGETS_AVAILABLE,
            upcoming_reservations: false,
            spend: false,
            ports: false,
          }),
          resolveForUser: (_user: unknown, availability: DashboardWidgetAvailability) =>
            resolveDashboardLayout(storedLayout, availability),
        } as any,
        {} as any,
        {} as any
      )

      const rendered: Array<{ component: string; props: any }> = []
      await controller.index({
        inertia: {
          render: (component: string, props: any) => {
            rendered.push({ component, props })
            return { component, props }
          },
          optional: (fn: unknown) => fn,
          defer: (fn: unknown, group: string) => ({ deferred: group, fn }),
        },
        request: { qs: () => ({}) },
        auth: {
          isAuthenticated: true,
          check: async () => {},
          getUserOrFail: () => ({
            id: 1,
            organizationId: 42,
            organization: { id: 42, plan: 'starter' },
            load: async () => {},
            hasPermission: async () => true,
            getEffectiveRoleInOrg: async () => 'member',
          }),
        },
        i18n: { locale: 'en' },
      } as any)

      const props = rendered[0]!.props
      assert.notProperty(props, 'activity')
      assert.notProperty(props, 'plannedTasks')
      assert.isTrue(props.layout.isCustomized)
      // Les widgets de la galerie, absents de l'ordre stocké, restent masqués.
      assert.deepEqual(props.layout.hidden, [
        'activity',
        'planned_tasks',
        'safety_compliance',
        'fuel',
        'low_stock',
        'invoicing',
        'charter_occupancy',
      ])
      // Sans module Location, `upcoming_reservations` n'est pas dans la disposition servie.
      assert.deepEqual(props.layout.order.main, ['boats', 'attention', 'at_sea', 'activity'])
    } finally {
      storedLayout = null
    }
  })

  test('renders the dedicated mechanic dashboard for a mechanic', async ({ assert }) => {
    const controller = new HomeController(
      {
        getForUser: async () => {
          throw new Error('should not be called')
        },
      } as any,
      {
        getLatestFleetAnalysis: async (_userId: number, _orgId: number, _locale: string) => null,
      } as any,
      {
        listNamesForOrg: async () => [],
      } as any,
      {
        getPlanningForOrg: async () => ({
          overdueTasks: [{ id: 1 }],
          soonTasks: [{ id: 2 }],
        }),
      } as any,
      {
        getBoatUsage: async () => {
          throw new Error('should not be called')
        },
      } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {
        availabilityFor: async () => {
          throw new Error('should not be called')
        },
      } as any,
      {} as any,
      {} as any
    )

    const rendered: Array<{ component: string; props: any }> = []

    await controller.index({
      inertia: {
        render: (component: string, props: any) => {
          rendered.push({ component, props })
          return { component, props }
        },
      },
      auth: {
        isAuthenticated: true,
        check: async () => {},
        getUserOrFail: () => ({
          id: 1,
          organizationId: 42,
          hasPermission: async () => true,
          getEffectiveRoleInOrg: async () => 'mechanic',
        }),
      },
      i18n: { locale: 'en' },
    } as any)

    assert.equal(rendered[0]!.component, 'dashboard/mechanic')
    assert.deepEqual(rendered[0]!.props, {
      overdueTasks: [{ id: 1 }],
      soonTasks: [{ id: 2 }],
    })
  })
})
