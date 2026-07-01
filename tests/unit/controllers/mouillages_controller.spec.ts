import { test } from '@japa/runner'
import MouillagesController from '#controllers/mouillages_controller'

test.group('MouillagesController (unit)', () => {
  function makeController() {
    const portService = { getForUserOrFail: async () => ({ id: 1 }) }
    const mouillageService = {
      getForUserOrFail: async () => ({ id: 1 }),
      updateForPort: async () => {},
      updatePosition: async () => {},
      deleteForPort: async () => {},
    }
    return new MouillagesController(mouillageService as any, portService as any)
  }

  function makeContext(overrides: Record<string, unknown> = {}) {
    return {
      params: { portId: '1', mouillageId: '1' },
      auth: { authenticate: async () => {}, getUserOrFail: () => ({}) },
      response: {
        redirect: (url?: string) => {
          if (url !== undefined) return { url }
          return { back: () => {} }
        },
      },
      session: { flash: () => {} },
      ...overrides,
    }
  }

  test('update — appelle authorize("edit")', async ({ assert }) => {
    const controller = makeController()
    let authorizedAction: string | null = null

    await controller.update({
      ...makeContext({
        request: { validateUsing: async () => ({ name: 'M1' }) },
        bouncer: {
          with: () => ({
            authorize: async (action: string) => {
              authorizedAction = action
            },
          }),
        },
      }),
    } as any)

    assert.equal(authorizedAction, 'edit')
  })

  test('destroy — appelle authorize("delete")', async ({ assert }) => {
    const controller = makeController()
    let authorizedAction: string | null = null

    await controller.destroy({
      ...makeContext({
        bouncer: {
          with: () => ({
            authorize: async (action: string) => {
              authorizedAction = action
            },
          }),
        },
      }),
    } as any)

    assert.equal(authorizedAction, 'delete')
  })

  test('updatePosition — appelle authorize("edit") et redirige', async ({ assert }) => {
    const controller = makeController()
    let authorizedAction: string | null = null
    let redirectedBack = false

    await controller.updatePosition({
      ...makeContext({
        request: { validateUsing: async () => ({ x: 10, y: 20 }) },
        bouncer: {
          with: () => ({
            authorize: async (action: string) => {
              authorizedAction = action
            },
          }),
        },
        response: {
          redirect: (url?: string) => {
            if (url !== undefined) return { url }
            return {
              back: () => {
                redirectedBack = true
              },
            }
          },
        },
      }),
    } as any)

    assert.equal(authorizedAction, 'edit')
    assert.isTrue(redirectedBack)
  })
})
