import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { toMouillageForFront } from '#transformers/mouillage_transformer'
import type Mouillage from '#models/mouillage'
import type Spot from '#models/spot'

function makeSpot(overrides: Partial<Spot> = {}): Spot {
  return {
    id: 1,
    name: 'M1',
    description: null,
    pontoonId: null,
    mouillageId: 3,
    organizationId: 2,
    createdAt: DateTime.fromISO('2026-07-04T10:00:00.000Z'),
    updatedAt: null,
    ...overrides,
  } as unknown as Spot
}

function makeMouillage(overrides: Partial<Mouillage> = {}): Mouillage {
  return {
    id: 3,
    portId: 1,
    name: 'Mouillage Sud',
    description: 'South anchorage',
    positionX: 100,
    positionY: 200,
    spots: [],
    createdAt: DateTime.fromISO('2026-07-04T10:00:00.000Z'),
    updatedAt: DateTime.fromISO('2026-07-04T12:00:00.000Z'),
    ...overrides,
  } as unknown as Mouillage
}

test.group('toMouillageForFront', () => {
  test('maps all fields on the happy path', ({ assert }) => {
    const m = makeMouillage()
    const result = toMouillageForFront(m)

    assert.equal(result.id, 3)
    assert.equal(result.portId, 1)
    assert.equal(result.name, 'Mouillage Sud')
    assert.equal(result.description, 'South anchorage')
    assert.equal(result.positionX, 100)
    assert.equal(result.positionY, 200)
    assert.isArray(result.spots)
    assert.lengthOf(result.spots, 0)
    assert.isString(result.createdAt)
  })

  test('spots undefined defaults to empty array', ({ assert }) => {
    const m = makeMouillage({ spots: undefined as unknown as Mouillage['spots'] })
    const result = toMouillageForFront(m)
    assert.lengthOf(result.spots, 0)
  })

  test('spots are mapped via toSpotForFront', ({ assert }) => {
    const spot = makeSpot({ id: 7, name: 'M7' })
    const m = makeMouillage({ spots: [spot] as unknown as Mouillage['spots'] })
    const result = toMouillageForFront(m)

    assert.lengthOf(result.spots, 1)
    assert.equal(result.spots[0]!.id, 7)
    assert.equal(result.spots[0]!.name, 'M7')
  })

  test('description null stays null', ({ assert }) => {
    const m = makeMouillage({ description: null })
    const result = toMouillageForFront(m)
    assert.isNull(result.description)
  })

  test('positionX and positionY null stays null', ({ assert }) => {
    const m = makeMouillage({ positionX: null, positionY: null })
    const result = toMouillageForFront(m)
    assert.isNull(result.positionX)
    assert.isNull(result.positionY)
  })

  test('updatedAt null returns null', ({ assert }) => {
    const m = makeMouillage({ updatedAt: null })
    const result = toMouillageForFront(m)
    assert.isNull(result.updatedAt)
  })
})
