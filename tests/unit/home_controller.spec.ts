import { test } from '@japa/runner'
import HomeController from '#controllers/home_controller'

test.group('HomeController (unit)', () => {
  test('renders home when unauthenticated', async ({ assert }) => {
    const controller = new HomeController({
      getForUser: async () => {
        throw new Error('should not be called')
      },
    } as any)

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
    const controller = new HomeController({
      getForUser: async () => ({
        boats: [],
        urgentMaintenance: [],
        stats: { boats: 0, engines: 0, sails: 0, rigs: 0, urgentMaintenance: 0 },
      }),
    } as any)

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
        getUserOrFail: () => ({ organizationId: 1 }),
      },
    } as any)

    assert.equal(rendered[0]!.component, 'dashboard')
  })
})
