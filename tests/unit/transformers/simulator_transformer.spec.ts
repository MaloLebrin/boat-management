import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  toSimulatorLeadForFront,
  toSimulatorShareForFront,
} from '#transformers/simulator_transformer'
import type SimulatorLead from '#models/simulator_lead'
import type SimulatorShare from '#models/simulator_share'

function makeSimulatorLead(overrides: Partial<SimulatorLead> = {}): SimulatorLead {
  return {
    id: 'uuid-lead-1',
    email: 'john@example.com',
    boatType: 'voilier',
    lengthM: 10,
    hullWear: 'medium',
    engineWear: 'low',
    safetyWear: 'high',
    riggingWear: 'medium',
    winteringZone: 'south',
    totalMin: 5000,
    totalMax: 10000,
    locale: 'fr',
    createdAt: DateTime.fromISO('2026-07-04T10:00:00.000Z'),
    ...overrides,
  } as unknown as SimulatorLead
}

function makeSimulatorShare(overrides: Partial<SimulatorShare> = {}): SimulatorShare {
  return {
    id: 'uuid-share-1',
    token: 'abc123token',
    input: { boatType: 'voilier', lengthM: 10 },
    breakdown: { hull: 2000, engine: 3000 },
    locale: 'en',
    createdAt: DateTime.fromISO('2026-07-04T10:00:00.000Z'),
    ...overrides,
  } as unknown as SimulatorShare
}

test.group('toSimulatorLeadForFront', () => {
  test('maps all fields on the happy path', ({ assert }) => {
    const lead = makeSimulatorLead()
    const result = toSimulatorLeadForFront(lead)

    assert.equal(result.id, 'uuid-lead-1')
    assert.equal(result.email, 'john@example.com')
    assert.equal(result.boatType, 'voilier')
    assert.equal(result.lengthM, 10)
    assert.equal(result.hullWear, 'medium')
    assert.equal(result.engineWear, 'low')
    assert.equal(result.safetyWear, 'high')
    assert.equal(result.riggingWear, 'medium')
    assert.equal(result.winteringZone, 'south')
    assert.equal(result.totalMin, 5000)
    assert.equal(result.totalMax, 10000)
    assert.equal(result.locale, 'fr')
    assert.isString(result.createdAt)
  })

  test('nullable wear fields can be null', ({ assert }) => {
    const lead = makeSimulatorLead({
      hullWear: null,
      engineWear: null,
      safetyWear: null,
      riggingWear: null,
      winteringZone: null,
    })
    const result = toSimulatorLeadForFront(lead)
    assert.isNull(result.hullWear)
    assert.isNull(result.engineWear)
    assert.isNull(result.safetyWear)
    assert.isNull(result.riggingWear)
    assert.isNull(result.winteringZone)
  })

  test('createdAt is ISO string', ({ assert }) => {
    const lead = makeSimulatorLead()
    const result = toSimulatorLeadForFront(lead)
    assert.match(result.createdAt!, /^\d{4}-\d{2}-\d{2}T/)
  })
})

test.group('toSimulatorShareForFront', () => {
  test('maps all fields on the happy path', ({ assert }) => {
    const share = makeSimulatorShare()
    const result = toSimulatorShareForFront(share)

    assert.equal(result.id, 'uuid-share-1')
    assert.equal(result.token, 'abc123token')
    assert.deepEqual(result.input, { boatType: 'voilier', lengthM: 10 })
    assert.deepEqual(result.breakdown, { hull: 2000, engine: 3000 })
    assert.equal(result.locale, 'en')
    assert.isString(result.createdAt)
  })

  test('createdAt is ISO string', ({ assert }) => {
    const share = makeSimulatorShare()
    const result = toSimulatorShareForFront(share)
    assert.match(result.createdAt!, /^\d{4}-\d{2}-\d{2}T/)
  })
})
