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

test('renders benchmark block when benchmark prop is provided', () => {
  const w = mount(SimulatorResultCard, {
    props: { breakdown, input, benchmark: { avgMin: 800, avgMax: 2000, count: 42 } },
  })
  expect(w.text()).toContain('simulator.benchmark_label')
  expect(w.text()).toContain('800')
  expect(w.text()).toContain('2')
})

test('does not render benchmark block when benchmark is absent', () => {
  const w = mount(SimulatorResultCard, { props: { breakdown, input } })
  expect(w.text()).not.toContain('simulator.benchmark_label')
})
