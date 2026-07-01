import { test } from '@japa/runner'
import SpotsController from '#controllers/spots_controller'

test.group('SpotsController (unit)', () => {
  function makeController() {
    const spotService = {
      getForUserOrFail: async () => ({ id: 1 }),
      update: async () => {},
      delete: async () => {},
    }
    return new SpotsController(spotService as any, {} as any, {} as any, {} as any)
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

  test('update — appelle authorize("edit")', async ({ assert }) => {
    const controller = makeController()
    let authorizedAction: string | null = null

    await controller.update({
      ...makeContext({
        request: { validateUsing: async () => ({ name: 'S1' }) },
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
})
