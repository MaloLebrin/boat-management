import { test } from '@japa/runner'
import PontoonService from '#services/pontoon_service'
import Organization from '#models/organization'
import Port from '#models/port'
import Pontoon from '#models/pontoon'

test.group('PontoonService (unit)', (group) => {
  group.each.teardown(async () => {
    await Pontoon.query().delete()
    await Port.query().delete()
    await Organization.query().delete()
  })

  test('updatePosition persists x and y on pontoon', async ({ assert }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-pontoon-1' })
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
      positionX: 10,
      positionY: 20,
    })

    const service = new PontoonService()
    await service.updatePosition(pontoon, { x: 100, y: 200 })

    await pontoon.refresh()
    assert.equal(pontoon.positionX, 100)
    assert.equal(pontoon.positionY, 200)
  })
})
