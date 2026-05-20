import { test } from '@japa/runner'
import PontoonsController from '#controllers/pontoons_controller'
import Organization from '#models/organization'
import User from '#models/user'
import Port from '#models/port'
import Pontoon from '#models/pontoon'

test.group('PontoonsController.updatePosition (unit)', (group) => {
  group.each.teardown(async () => {
    await Pontoon.query().delete()
    await Port.query().delete()
    await User.query().delete()
    await Organization.query().delete()
  })

  test('redirects back after updating pontoon position', async ({ assert }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-pontoon-ctrl-1' })
    const user = await User.create({
      email: 'pontoon-ctrl@example.com',
      password: 'Password123!',
      fullName: 'Pontoon Ctrl',
      organizationId: org.id,
    })
    const port = await Port.create({
      organizationId: org.id,
      name: 'Harbor',
      city: null,
      country: null,
      address: null,
      notes: null,
    })
    const pontoon = await Pontoon.create({
      portId: port.id,
      name: 'A',
      description: null,
      positionX: 0,
      positionY: 0,
    })

    let redirectedBack = false
    const controller = new PontoonsController()

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
