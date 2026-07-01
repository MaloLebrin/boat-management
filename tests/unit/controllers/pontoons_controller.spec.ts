import { test } from '@japa/runner'
import PontoonsController from '#controllers/pontoons_controller'

test.group('PontoonsController (unit)', () => {
  function makeController() {
    const portService = { getForUserOrFail: async () => ({ id: 1 }) }
    const pontoonService = {
      getForUserOrFail: async () => ({ id: 1, positionX: 0, positionY: 0 }),
      updateForPort: async () => {},
      updatePosition: async (p: any, payload: { x: number; y: number }) => {
        p.positionX = payload.x
        p.positionY = payload.y
      },
      deleteForPort: async () => {},
    }
    return new PontoonsController(pontoonService as any, portService as any)
  }

  function makeContext(overrides: Record<string, unknown> = {}) {
    return {
      params: { portId: '1', pontoonId: '1' },
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

  test('update — appelle authorize("edit") et redirige', async ({ assert }) => {
    const controller = makeController()
    let authorizedAction: string | null = null

    await controller.update({
      ...makeContext({
        request: { validateUsing: async () => ({ name: 'P1' }) },
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

  test('destroy — appelle authorize("delete") et redirige', async ({ assert }) => {
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
    let authorizedAction: string | null = null
    let redirectedBack = false
    const pontoon = { positionX: 0, positionY: 0 }
    const pontoonService = {
      getForUserOrFail: async () => pontoon,
      updatePosition: async (p: any, payload: { x: number; y: number }) => {
        p.positionX = payload.x
        p.positionY = payload.y
      },
    }
    const portService = { getForUserOrFail: async () => ({ id: 1 }) }
    const c = new PontoonsController(pontoonService as any, portService as any)

    await c.updatePosition({
      request: { validateUsing: async () => ({ x: 42, y: 84 }) },
      params: { portId: '1', pontoonId: '1' },
      auth: { authenticate: async () => {}, getUserOrFail: () => ({}) },
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
    } as any)

    assert.equal(authorizedAction, 'edit')
    assert.isTrue(redirectedBack)
    assert.equal(pontoon.positionX, 42)
    assert.equal(pontoon.positionY, 84)
  })
})
