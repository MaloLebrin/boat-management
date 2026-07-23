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
        getLatestFleetAnalysis: async (_userId: number, _orgId: number) => null,
      } as any,
      {
        listNamesForOrg: async () => [],
      } as any,
      {
        getPlanningForOrg: async () => {
          throw new Error('should not be called')
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
      },
      auth: {
        isAuthenticated: false,
        check: async () => {},
      },
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
        getLatestFleetAnalysis: async (_userId: number, _orgId: number) => null,
      } as any,
      {
        listNamesForOrg: async () => [],
      } as any,
      {
        getPlanningForOrg: async () => {
          throw new Error('should not be called')
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
      },
      auth: {
        isAuthenticated: true,
        check: async () => {},
        getUserOrFail: () => ({
          id: 1,
          organizationId: 42,
          hasPermission: async () => true,
          getEffectiveRoleInOrg: async () => 'member',
        }),
      },
    } as any)

    assert.equal(rendered[0]!.component, 'dashboard')
  })

  test('renders the dedicated mechanic dashboard for a mechanic', async ({ assert }) => {
    const controller = new HomeController(
      {
        getForUser: async () => {
          throw new Error('should not be called')
        },
      } as any,
      {
        getLatestFleetAnalysis: async (_userId: number, _orgId: number) => null,
      } as any,
      {
        listNamesForOrg: async () => [],
      } as any,
      {
        getPlanningForOrg: async () => ({
          overdueTasks: [{ id: 1 }],
          soonTasks: [{ id: 2 }],
        }),
      } as any
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
    } as any)

    assert.equal(rendered[0]!.component, 'dashboard/mechanic')
    assert.deepEqual(rendered[0]!.props, {
      overdueTasks: [{ id: 1 }],
      soonTasks: [{ id: 2 }],
    })
  })
})
