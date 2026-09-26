import { test } from '@japa/runner'
import HomeController from '#controllers/home_controller'

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
    assert.isNull(rendered[0]!.props.aiFleetAnalysisAt)
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
