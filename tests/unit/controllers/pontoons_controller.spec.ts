import { test } from '@japa/runner'
import PontoonsController from '#controllers/pontoons_controller'
import PontoonService from '#services/pontoon_service'
import PortService from '#services/port_service'
import { UserFactory } from '#database/factories/user_factory'
import { PortFactory } from '#database/factories/port_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'

test.group('PontoonsController.updatePosition (unit)', () => {
  test('redirects back after updating pontoon position', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id, positionX: 0, positionY: 0 }).create()

    let redirectedBack = false
    const controller = new PontoonsController(new PontoonService(), new PortService())

    await controller.updatePosition({
      request: {
        validateUsing: async () => ({ x: 42, y: 84 }),
      },
      params: { portId: String(port.id), pontoonId: String(pontoon.id) },
      auth: {
        authenticate: async () => {},
        getUserOrFail: () => user,
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

    assert.isTrue(redirectedBack)
    await pontoon.refresh()
    assert.equal(pontoon.positionX, 42)
    assert.equal(pontoon.positionY, 84)
  })
})
