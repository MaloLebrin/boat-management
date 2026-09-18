import { test } from '@japa/runner'
import SpotsController from '#controllers/spots_controller'
import SpotPolicy from '#policies/spot_policy'

test.group('SpotsController (unit)', () => {
  const spot = { id: 1 }

  function makeController() {
    const spotService = {
      getForUserOrFail: async () => spot,
      update: async () => {},
      delete: async () => {},
    }
    return new SpotsController(spotService as any, {} as any, {} as any, {} as any)
  }

  /** Ce que le contrôleur a demandé au bouncer : la policy, l'action, la ressource. */
  function spyBouncer() {
    const calls: { policy: unknown; action: string; resource: unknown }[] = []
    const bouncer = {
      with: (policy: unknown) => ({
        authorize: async (action: string, resource?: unknown) => {
          calls.push({ policy, action, resource })
        },
      }),
    }
    return { bouncer, calls }
  }

  function makeContext(overrides: Record<string, unknown> = {}) {
    return {
      params: { id: '1' },
      auth: { authenticate: async () => {}, getUserOrFail: () => ({}) },
      response: {
        redirect: (url?: string) => {
          if (url !== undefined) return { url }
          return { back: () => {} }
        },
      },
      ...overrides,
    }
  }

  // #719 : les routes de place lisaient `PortPolicy`, donc `ports.*` admin-only,
  // et les capacités `spots.*` du member ne servaient à rien.
  test('update — autorise `edit` via SpotPolicy, sur la place chargée', async ({ assert }) => {
    const { bouncer, calls } = spyBouncer()

    await makeController().update({
      ...makeContext({ request: { validateUsing: async () => ({ name: 'S1' }) }, bouncer }),
    } as any)

    assert.deepEqual(calls, [{ policy: SpotPolicy, action: 'edit', resource: spot }])
  })

  test('destroy — autorise `delete` via SpotPolicy, sur la place chargée', async ({ assert }) => {
    const { bouncer, calls } = spyBouncer()

    await makeController().destroy({ ...makeContext({ bouncer }) } as any)

    assert.deepEqual(calls, [{ policy: SpotPolicy, action: 'delete', resource: spot }])
  })
})
