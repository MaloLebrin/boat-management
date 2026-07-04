import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { toPontoonForFront } from '#transformers/pontoon_transformer'
import type Pontoon from '#models/pontoon'
import type Spot from '#models/spot'

function makeSpot(overrides: Partial<Spot> = {}): Spot {
  return {
    id: 1,
    name: 'A1',
    description: null,
    pontoonId: 2,
    mouillageId: null,
    organizationId: 2,
    createdAt: DateTime.fromISO('2026-07-04T10:00:00.000Z'),
    updatedAt: null,
    ...overrides,
  } as unknown as Spot
}

function makePontoon(overrides: Partial<Pontoon> = {}): Pontoon {
  return {
    id: 2,
    portId: 1,
    name: 'Pontoon A',
    description: 'Main pontoon',
    positionX: 50,
    positionY: 75,
    spots: [],
    createdAt: DateTime.fromISO('2026-07-04T10:00:00.000Z'),
    updatedAt: DateTime.fromISO('2026-07-04T12:00:00.000Z'),
    ...overrides,
  } as unknown as Pontoon
}

test.group('toPontoonForFront', () => {
  test('maps all fields on the happy path', ({ assert }) => {
    const p = makePontoon()
    const result = toPontoonForFront(p)

    assert.equal(result.id, 2)
    assert.equal(result.portId, 1)
    assert.equal(result.name, 'Pontoon A')
    assert.equal(result.description, 'Main pontoon')
    assert.equal(result.positionX, 50)
    assert.equal(result.positionY, 75)
    assert.isArray(result.spots)
    assert.lengthOf(result.spots, 0)
    assert.isString(result.createdAt)
  })

  test('spots undefined defaults to empty array', ({ assert }) => {
    const p = makePontoon({ spots: undefined as unknown as Pontoon['spots'] })
    const result = toPontoonForFront(p)
    assert.lengthOf(result.spots, 0)
  })

  test('spots are mapped via toSpotForFront', ({ assert }) => {
    const spot = makeSpot({ id: 9, name: 'A9' })
    const p = makePontoon({ spots: [spot] as unknown as Pontoon['spots'] })
    const result = toPontoonForFront(p)

    assert.lengthOf(result.spots, 1)
    assert.equal(result.spots[0]!.id, 9)
    assert.equal(result.spots[0]!.name, 'A9')
  })

  test('description null stays null', ({ assert }) => {
    const p = makePontoon({ description: null })
    const result = toPontoonForFront(p)
    assert.isNull(result.description)
  })

  test('positionX and positionY null stays null', ({ assert }) => {
    const p = makePontoon({ positionX: null, positionY: null })
    const result = toPontoonForFront(p)
    assert.isNull(result.positionX)
    assert.isNull(result.positionY)
  })

  test('updatedAt null returns null', ({ assert }) => {
    const p = makePontoon({ updatedAt: null })
    const result = toPontoonForFront(p)
    assert.isNull(result.updatedAt)
  })
})
