import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { toSpotForFront } from '#transformers/spot_transformer'
import type Spot from '#models/spot'

function makeSpot(overrides: Partial<Spot> = {}): Spot {
  return {
    id: 1,
    name: 'A1',
    description: 'Berth A1',
    pontoonId: 10,
    mouillageId: null,
    organizationId: 2,
    createdAt: DateTime.fromISO('2026-07-04T10:00:00.000Z'),
    updatedAt: DateTime.fromISO('2026-07-04T12:00:00.000Z'),
    ...overrides,
  } as unknown as Spot
}

test.group('toSpotForFront', () => {
  test('maps all fields on the happy path', ({ assert }) => {
    const spot = makeSpot()
    const result = toSpotForFront(spot)

    assert.equal(result.id, 1)
    assert.equal(result.name, 'A1')
    assert.equal(result.description, 'Berth A1')
    assert.equal(result.pontoonId, 10)
    assert.isNull(result.mouillageId)
    assert.equal(result.organizationId, 2)
    assert.isString(result.createdAt)
  })

  test('description null stays null', ({ assert }) => {
    const spot = makeSpot({ description: null })
    const result = toSpotForFront(spot)
    assert.isNull(result.description)
  })

  test('updatedAt null returns null', ({ assert }) => {
    const spot = makeSpot({ updatedAt: null })
    const result = toSpotForFront(spot)
    assert.isNull(result.updatedAt)
  })

  test('updatedAt present returns ISO string', ({ assert }) => {
    const spot = makeSpot({ updatedAt: DateTime.fromISO('2026-07-04T12:00:00.000Z') })
    const result = toSpotForFront(spot)
    assert.isString(result.updatedAt)
  })

  test('mouillageId present when pontoonId is null', ({ assert }) => {
    const spot = makeSpot({ pontoonId: null, mouillageId: 5 })
    const result = toSpotForFront(spot)
    assert.isNull(result.pontoonId)
    assert.equal(result.mouillageId, 5)
  })
})
