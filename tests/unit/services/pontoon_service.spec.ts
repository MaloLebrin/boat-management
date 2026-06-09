import { test } from '@japa/runner'
import PontoonService from '#services/pontoon_service'
import { PortFactory } from '#database/factories/port_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'

test.group('PontoonService (unit)', () => {
  test('updatePosition persists x and y on pontoon', async ({ assert }) => {
    const port = await PortFactory.with('organization').create()
    const pontoon = await PontoonFactory.merge({ portId: port.id, positionX: 10, positionY: 20 }).create()

    const service = new PontoonService()
    await service.updatePosition(pontoon, { x: 100, y: 200 })

    await pontoon.refresh()
    assert.equal(pontoon.positionX, 100)
    assert.equal(pontoon.positionY, 200)
  })
})
