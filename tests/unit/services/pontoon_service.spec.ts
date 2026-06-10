import { test } from '@japa/runner'
import PontoonService from '#services/pontoon_service'

test.group('PontoonService (unit)', () => {
  test('updatePosition persists x and y on pontoon', async ({ assert }) => {
    const pontoon = { positionX: 10, positionY: 20, save: async () => {} }

    const service = new PontoonService()
    await service.updatePosition(pontoon as any, { x: 100, y: 200 })

    assert.equal(pontoon.positionX, 100)
    assert.equal(pontoon.positionY, 200)
  })
})
