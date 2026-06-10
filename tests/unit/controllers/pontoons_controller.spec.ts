import { test } from '@japa/runner'
import PontoonsController from '#controllers/pontoons_controller'

test.group('PontoonsController.updatePosition (unit)', () => {
  test('redirects back after updating pontoon position', async ({ assert }) => {
    const pontoon = { positionX: 0, positionY: 0 }
    let redirectedBack = false

    const pontoonService = {
      getForUserOrFail: async () => pontoon,
      updatePosition: async (p: any, payload: { x: number; y: number }) => {
        p.positionX = payload.x
        p.positionY = payload.y
      },
    }

    const controller = new PontoonsController(pontoonService as any, {} as any)

    await controller.updatePosition({
      request: { validateUsing: async () => ({ x: 42, y: 84 }) },
      params: { portId: '1', pontoonId: '1' },
      auth: { authenticate: async () => {}, getUserOrFail: () => ({}) },
      bouncer: { with: () => ({ authorize: async () => {} }) },
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

    assert.isTrue(redirectedBack)
    assert.equal(pontoon.positionX, 42)
    assert.equal(pontoon.positionY, 84)
  })
})
