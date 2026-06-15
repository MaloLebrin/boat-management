import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import SimulatorResultCard from '../../inertia/components/marketing/simulator/SimulatorResultCard.vue'
import type { SimulatorCostBreakdown, SimulatorBoatInput } from '../../shared/types/simulator'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? key + JSON.stringify(params) : key,
  }),
}))

const breakdown: SimulatorCostBreakdown = {
  categories: [
    { key: 'hull', minCost: 500, maxCost: 1200 },
    { key: 'engine', minCost: 300, maxCost: 800 },
    { key: 'safety', minCost: 100, maxCost: 300 },
  ],
  totalMin: 900,
  totalMax: 2300,
}

const input: SimulatorBoatInput = {
  boatType: 'sailboat',
  lengthM: 10,
  yearBuilt: 2010,
  navigationCategory: 'B',
  hasDedicatedEngine: true,
  hullWear: 'good',
  engineWear: 'good',
  safetyWear: 'new',
  riggingWear: 'worn',
}

test('renders one row per cost category', () => {
  const w = mount(SimulatorResultCard, { props: { breakdown, input } })
  // 3 categories → 3 translated label keys displayed
  expect(w.text()).toContain('simulator.cat_hull')
  expect(w.text()).toContain('simulator.cat_engine')
  expect(w.text()).toContain('simulator.cat_safety')
})

test('displays min and max cost for each category', () => {
  const w = mount(SimulatorResultCard, { props: { breakdown, input } })
  // hull: 500 € – 1 200 €
  expect(w.text()).toContain('500')
  expect(w.text()).toContain('1')
  expect(w.text()).toContain('300')
})

test('displays totalMin in the total section', () => {
  const w = mount(SimulatorResultCard, { props: { breakdown, input } })
  expect(w.text()).toContain('900')
})

test('shows result_title and result_subtitle keys', () => {
  const w = mount(SimulatorResultCard, { props: { breakdown, input } })
  expect(w.text()).toContain('simulator.result_title')
  expect(w.text()).toContain('simulator.result_subtitle')
})

test('emits restart when recalculate button clicked', async () => {
  const w = mount(SimulatorResultCard, { props: { breakdown, input } })
  const buttons = w.findAll('button')
  const restartBtn = buttons.find((b) => b.text().includes('simulator.recalculate'))
  expect(restartBtn).toBeDefined()
  await restartBtn!.trigger('click')
  expect(w.emitted('restart')).toBeTruthy()
})

test('does not render share button when showShare is false', () => {
  const w = mount(SimulatorResultCard, { props: { breakdown, input, showShare: false } })
  const buttons = w.findAll('button')
  const shareBtn = buttons.find((b) => b.text().includes('simulator.share_button'))
  expect(shareBtn).toBeUndefined()
})

test('renders share button when showShare is true', () => {
  const w = mount(SimulatorResultCard, { props: { breakdown, input, showShare: true } })
  expect(w.text()).toContain('simulator.share_button')
})

test('emits share when share button clicked', async () => {
  const w = mount(SimulatorResultCard, { props: { breakdown, input, showShare: true } })
  const buttons = w.findAll('button')
  const shareBtn = buttons.find((b) => b.text().includes('simulator.share_button'))
  await shareBtn!.trigger('click')
  expect(w.emitted('share')).toBeTruthy()
})

// breakdown userAvg = (900+2300)/2 = 1600, benchmarkAvg = (800+2000)/2 = 1400 → +14% → above
test('renders benchmark_above when user costs exceed average by more than 5%', () => {
  const w = mount(SimulatorResultCard, {
    props: { breakdown, input, benchmark: { avgMin: 800, avgMax: 2000, count: 42 } },
  })
  expect(w.text()).toContain('simulator.benchmark_above')
  expect(w.text()).toContain('800')
})

// userAvg = (700+1300)/2 = 1000, benchmarkAvg = 1400 → -28% → below
test('renders benchmark_below when user costs are below average by more than 5%', () => {
  const cheapBreakdown: SimulatorCostBreakdown = {
    categories: [{ key: 'hull', minCost: 400, maxCost: 900 }],
    totalMin: 700,
    totalMax: 1300,
  }
  const w = mount(SimulatorResultCard, {
    props: {
      breakdown: cheapBreakdown,
      input,
      benchmark: { avgMin: 800, avgMax: 2000, count: 15 },
    },
  })
  expect(w.text()).toContain('simulator.benchmark_below')
})

// userAvg = (1200+1600)/2 = 1400, benchmarkAvg = 1400 → 0% → similar
test('renders benchmark_similar when user costs are within 5% of average', () => {
  const similarBreakdown: SimulatorCostBreakdown = {
    categories: [{ key: 'hull', minCost: 800, maxCost: 1200 }],
    totalMin: 1200,
    totalMax: 1600,
  }
  const w = mount(SimulatorResultCard, {
    props: {
      breakdown: similarBreakdown,
      input,
      benchmark: { avgMin: 800, avgMax: 2000, count: 20 },
    },
  })
  expect(w.text()).toContain('simulator.benchmark_similar')
})

test('does not render benchmark block when benchmark is absent', () => {
  const w = mount(SimulatorResultCard, { props: { breakdown, input } })
  expect(w.text()).not.toContain('simulator.benchmark_above')
  expect(w.text()).not.toContain('simulator.benchmark_below')
  expect(w.text()).not.toContain('simulator.benchmark_similar')
})
