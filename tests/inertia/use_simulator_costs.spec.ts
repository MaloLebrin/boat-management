import { test, expect } from 'vitest'
import { computeSimulatorCosts } from '../../inertia/composables/use_simulator_costs'
import type { SimulatorBoatInput } from '../../shared/types/simulator'

function makeInput(overrides: Partial<SimulatorBoatInput> = {}): SimulatorBoatInput {
  return {
    boatType: 'sailboat',
    lengthM: 9,
    yearBuilt: 2010,
    navigationCategory: 'B',
    hasDedicatedEngine: false,
    hullWear: 'good',
    engineWear: null,
    safetyWear: 'good',
    riggingWear: null,
    winteringZone: 'outdoor',
    ...overrides,
  }
}

test('returns categories array and totalMin/totalMax', () => {
  const result = computeSimulatorCosts(makeInput())
  expect(Array.isArray(result.categories)).toBe(true)
  expect(typeof result.totalMin).toBe('number')
  expect(typeof result.totalMax).toBe('number')
})

test('totalMin is always less than or equal to totalMax', () => {
  const result = computeSimulatorCosts(makeInput())
  expect(result.totalMin).toBeLessThanOrEqual(result.totalMax)
})

test('totalMin equals sum of all category minCosts', () => {
  const result = computeSimulatorCosts(makeInput())
  const sumMin = result.categories.reduce((acc, cat) => acc + cat.minCost, 0)
  expect(result.totalMin).toBe(sumMin)
})

test('totalMax equals sum of all category maxCosts', () => {
  const result = computeSimulatorCosts(makeInput())
  const sumMax = result.categories.reduce((acc, cat) => acc + cat.maxCost, 0)
  expect(result.totalMax).toBe(sumMax)
})

test('hull category is always present', () => {
  const result = computeSimulatorCosts(makeInput())
  expect(result.categories.some((c) => c.key === 'hull')).toBe(true)
})

test('safety category is always present', () => {
  const result = computeSimulatorCosts(makeInput())
  expect(result.categories.some((c) => c.key === 'safety')).toBe(true)
})

test('electrical category is always present', () => {
  const result = computeSimulatorCosts(makeInput())
  expect(result.categories.some((c) => c.key === 'electrical')).toBe(true)
})

test('mooring category is always present', () => {
  const result = computeSimulatorCosts(makeInput())
  expect(result.categories.some((c) => c.key === 'mooring')).toBe(true)
})

test('engine category is included for motorboat', () => {
  const result = computeSimulatorCosts(makeInput({ boatType: 'motorboat', engineWear: 'good' }))
  expect(result.categories.some((c) => c.key === 'engine')).toBe(true)
})

test('engine category is included for rib', () => {
  const result = computeSimulatorCosts(makeInput({ boatType: 'rib', engineWear: 'good' }))
  expect(result.categories.some((c) => c.key === 'engine')).toBe(true)
})

test('engine category is included when hasDedicatedEngine is true', () => {
  const result = computeSimulatorCosts(makeInput({ hasDedicatedEngine: true, engineWear: 'good' }))
  expect(result.categories.some((c) => c.key === 'engine')).toBe(true)
})

test('engine category is absent for sailboat without dedicated engine', () => {
  const result = computeSimulatorCosts(
    makeInput({ boatType: 'sailboat', hasDedicatedEngine: false, engineWear: null })
  )
  expect(result.categories.some((c) => c.key === 'engine')).toBe(false)
})

test('rigging category is included for sailboat with riggingWear', () => {
  const result = computeSimulatorCosts(makeInput({ boatType: 'sailboat', riggingWear: 'good' }))
  expect(result.categories.some((c) => c.key === 'rigging')).toBe(true)
})

test('rigging category is included for catamaran with riggingWear', () => {
  const result = computeSimulatorCosts(makeInput({ boatType: 'catamaran', riggingWear: 'good' }))
  expect(result.categories.some((c) => c.key === 'rigging')).toBe(true)
})

test('rigging category is absent for motorboat', () => {
  const result = computeSimulatorCosts(makeInput({ boatType: 'motorboat', riggingWear: 'good' }))
  expect(result.categories.some((c) => c.key === 'rigging')).toBe(false)
})

test('to_replace wear level produces higher costs than new', () => {
  const resultNew = computeSimulatorCosts(makeInput({ hullWear: 'new', safetyWear: 'new' }))
  const resultWorn = computeSimulatorCosts(
    makeInput({ hullWear: 'to_replace', safetyWear: 'to_replace' })
  )
  expect(resultWorn.totalMin).toBeGreaterThan(resultNew.totalMin)
  expect(resultWorn.totalMax).toBeGreaterThan(resultNew.totalMax)
})

test('worn wear level produces higher costs than good', () => {
  const resultGood = computeSimulatorCosts(makeInput({ hullWear: 'good', safetyWear: 'good' }))
  const resultWorn = computeSimulatorCosts(makeInput({ hullWear: 'worn', safetyWear: 'worn' }))
  expect(resultWorn.totalMin).toBeGreaterThan(resultGood.totalMin)
})

test('very short boat (length 1) falls back to smallest bracket costs', () => {
  const result = computeSimulatorCosts(makeInput({ lengthM: 1 }))
  // Should use the maxLength=6 bracket; hull min=250*1.0=250
  const hull = result.categories.find((c) => c.key === 'hull')!
  expect(hull.minCost).toBe(250)
  expect(hull.maxCost).toBe(350)
})

test('very long boat (length 30) uses last bracket costs', () => {
  const result = computeSimulatorCosts(makeInput({ lengthM: 30 }))
  // Should use the Infinity bracket; hull min=2500*1.0=2500
  const hull = result.categories.find((c) => c.key === 'hull')!
  expect(hull.minCost).toBe(2500)
  expect(hull.maxCost).toBe(3500)
})

test('covered wintering zone reduces hull costs compared to outdoor', () => {
  const outdoor = computeSimulatorCosts(makeInput({ winteringZone: 'outdoor' }))
  const covered = computeSimulatorCosts(makeInput({ winteringZone: 'covered' }))
  const hullOutdoor = outdoor.categories.find((c) => c.key === 'hull')!
  const hullCovered = covered.categories.find((c) => c.key === 'hull')!
  expect(hullCovered.minCost).toBeLessThan(hullOutdoor.minCost)
})

test('sea wintering zone increases hull costs compared to outdoor', () => {
  const outdoor = computeSimulatorCosts(makeInput({ winteringZone: 'outdoor' }))
  const sea = computeSimulatorCosts(makeInput({ winteringZone: 'sea' }))
  const hullOutdoor = outdoor.categories.find((c) => c.key === 'hull')!
  const hullSea = sea.categories.find((c) => c.key === 'hull')!
  expect(hullSea.minCost).toBeGreaterThan(hullOutdoor.minCost)
})

test('each category minCost is less than or equal to maxCost', () => {
  const result = computeSimulatorCosts(
    makeInput({
      boatType: 'sailboat',
      riggingWear: 'worn',
      hasDedicatedEngine: true,
      engineWear: 'good',
    })
  )
  for (const cat of result.categories) {
    expect(cat.minCost).toBeLessThanOrEqual(cat.maxCost)
  }
})

test('boundary: length exactly at bracket limit (6) uses next bracket (6-9)', () => {
  // getCostsForLength uses strict `<`, so lengthM=6 goes to the 6-9 bracket (maxLength=9)
  const result = computeSimulatorCosts(makeInput({ lengthM: 6 }))
  const hull = result.categories.find((c) => c.key === 'hull')!
  // 6-9 bracket: hull min=500, max=700
  expect(hull.minCost).toBe(500)
  expect(hull.maxCost).toBe(700)
})
