import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { toBoatEngineDetail } from '#transformers/boat_engine_transformer'
import type BoatEngine from '#models/boat_engine'
import type BoatEnginePart from '#models/boat_engine_part'

function makePart(overrides: Partial<BoatEnginePart> = {}): BoatEnginePart {
  return {
    id: 10,
    boatEngineId: 1,
    designation: 'Oil filter',
    reference: 'REF-001',
    supplier: 'Acme',
    stock: 2,
    minStockAlert: 1,
    wearState: 'good',
    notes: null,
    ...overrides,
  } as unknown as BoatEnginePart
}

function makeEngine(overrides: Partial<BoatEngine> = {}): BoatEngine {
  return {
    id: 1,
    boatId: 42,
    kind: 'inboard',
    fuel: 'diesel',
    brand: 'Volvo',
    model: 'D2-40',
    serialNumber: 'SN-123',
    manufacturedAt: DateTime.fromISO('2020-06-15'),
    powerHp: 40,
    powerKw: 29,
    hours: 500,
    installHours: 0,
    strokeType: '4',
    status: 'active',
    notes: 'Runs well',
    parts: [],
    createdAt: DateTime.fromISO('2026-07-04T10:00:00.000+00:00'),
    updatedAt: DateTime.fromISO('2026-07-04T12:00:00.000+00:00'),
    ...overrides,
  } as unknown as BoatEngine
}

test.group('toBoatEngineDetail', () => {
  test('maps all fields on the happy path', ({ assert }) => {
    const engine = makeEngine()
    const result = toBoatEngineDetail(engine)

    assert.equal(result.id, 1)
    assert.equal(result.boatId, 42)
    assert.equal(result.kind, 'inboard')
    assert.equal(result.fuel, 'diesel')
    assert.equal(result.brand, 'Volvo')
    assert.equal(result.model, 'D2-40')
    assert.equal(result.serialNumber, 'SN-123')
    assert.equal(result.manufacturedAt, '2020-06-15')
    assert.equal(result.powerHp, 40)
    assert.equal(result.powerKw, 29)
    assert.equal(result.hours, 500)
    assert.equal(result.installHours, 0)
    assert.equal(result.strokeType, '4')
    assert.equal(result.status, 'active')
    assert.equal(result.notes, 'Runs well')
    assert.isArray(result.parts)
    assert.lengthOf(result.parts, 0)
  })

  test('manufacturedAt null returns null', ({ assert }) => {
    const engine = makeEngine({ manufacturedAt: null })
    const result = toBoatEngineDetail(engine)
    assert.isNull(result.manufacturedAt)
  })

  test('updatedAt null returns null', ({ assert }) => {
    const engine = makeEngine({ updatedAt: null })
    const result = toBoatEngineDetail(engine)
    assert.isNull(result.updatedAt)
  })

  test('updatedAt present returns ISO string', ({ assert }) => {
    const engine = makeEngine({
      updatedAt: DateTime.fromISO('2026-07-04T12:00:00.000Z'),
    })
    const result = toBoatEngineDetail(engine)
    assert.isString(result.updatedAt)
  })

  test('parts undefined defaults to empty array', ({ assert }) => {
    const engine = makeEngine({ parts: undefined as unknown as BoatEngine['parts'] })
    const result = toBoatEngineDetail(engine)
    assert.lengthOf(result.parts, 0)
  })

  test('parts array is mapped correctly', ({ assert }) => {
    const part = makePart({ id: 99, designation: 'Belt', reference: 'B-01' })
    const engine = makeEngine({ parts: [part] as unknown as BoatEngine['parts'] })
    const result = toBoatEngineDetail(engine)

    assert.lengthOf(result.parts, 1)
    assert.equal(result.parts[0]!.id, 99)
    assert.equal(result.parts[0]!.designation, 'Belt')
    assert.equal(result.parts[0]!.reference, 'B-01')
  })

  test('createdAt is ISO string', ({ assert }) => {
    const engine = makeEngine()
    const result = toBoatEngineDetail(engine)
    assert.isString(result.createdAt)
  })
})
