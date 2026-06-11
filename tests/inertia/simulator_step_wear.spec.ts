import { mount } from '@vue/test-utils'
import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import SimulatorStepWear from '../../inertia/components/marketing/simulator/SimulatorStepWear.vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

test('renders 4 wear option buttons', () => {
  const w = mount(SimulatorStepWear, {
    props: {
      modelValue: {},
      wearField: 'hullWear',
      labelKey: 'simulator.hull_wear_label',
    },
  })
  const buttons = w.findAll('button')
  // 4 BaseOptionCard buttons + 1 back button = 5 buttons
  expect(buttons.length).toBeGreaterThanOrEqual(5)
})

test('emits update:modelValue with correct wearField when option clicked', async () => {
  const w = mount(SimulatorStepWear, {
    props: {
      modelValue: {},
      wearField: 'hullWear',
      labelKey: 'simulator.hull_wear_label',
    },
  })
  const buttons = w.findAll('button')
  // First button is 'new' option
  await buttons[0].trigger('click')

  const emitted = w.emitted('update:modelValue')
  expect(emitted).toBeTruthy()
  expect(emitted![0][0]).toEqual({ hullWear: 'new' })
})

test('auto-advances after delay', async () => {
  vi.useFakeTimers()

  const w = mount(SimulatorStepWear, {
    props: {
      modelValue: {},
      wearField: 'hullWear',
      labelKey: 'simulator.hull_wear_label',
    },
  })
  const buttons = w.findAll('button')
  await buttons[0].trigger('click')

  vi.advanceTimersByTime(320)

  expect(w.emitted('next')).toBeTruthy()

  vi.useRealTimers()
})

test('does not emit next before delay', async () => {
  vi.useFakeTimers()

  const w = mount(SimulatorStepWear, {
    props: {
      modelValue: {},
      wearField: 'hullWear',
      labelKey: 'simulator.hull_wear_label',
    },
  })
  const buttons = w.findAll('button')
  await buttons[0].trigger('click')

  vi.advanceTimersByTime(100)

  expect(w.emitted('next')).toBeFalsy()

  vi.useRealTimers()
})

test('emits back when back button clicked', async () => {
  const w = mount(SimulatorStepWear, {
    props: {
      modelValue: {},
      wearField: 'hullWear',
      labelKey: 'simulator.hull_wear_label',
    },
  })
  const buttons = w.findAll('button')
  // Last button is the back button
  const backButton = buttons[buttons.length - 1]
  await backButton.trigger('click')

  expect(w.emitted('back')).toBeTruthy()
})

test('shows mention text when mention prop provided', () => {
  const w = mount(SimulatorStepWear, {
    props: {
      modelValue: {},
      wearField: 'safetyWear',
      labelKey: 'simulator.safety_wear_label',
      mention: 'simulator.safety_mention',
    },
  })
  expect(w.text()).toContain('simulator.safety_mention')
})

test('does not show mention when not provided', () => {
  const w = mount(SimulatorStepWear, {
    props: {
      modelValue: {},
      wearField: 'hullWear',
      labelKey: 'simulator.hull_wear_label',
    },
  })
  const mentionParagraphs = w.findAll('p.text-xs.text-fg-muted')
  expect(mentionParagraphs.length).toBe(0)
})

test('shows check icon only on selected option', () => {
  const w = mount(SimulatorStepWear, {
    props: {
      modelValue: { hullWear: 'good' },
      wearField: 'hullWear',
      labelKey: 'simulator.hull_wear_label',
    },
  })
  const svgs = w.findAll('svg')
  expect(svgs.length).toBe(1)
})

test('works with riggingWear field', async () => {
  const w = mount(SimulatorStepWear, {
    props: {
      modelValue: {},
      wearField: 'riggingWear',
      labelKey: 'simulator.rigging_wear_label',
    },
  })
  const buttons = w.findAll('button')
  // Third button is 'worn' option (index 2)
  await buttons[2].trigger('click')

  const emitted = w.emitted('update:modelValue')
  expect(emitted).toBeTruthy()
  expect(emitted![0][0]).toEqual({ riggingWear: 'worn' })
})

beforeEach(() => {
  vi.clearAllTimers()
})

afterEach(() => {
  vi.useRealTimers()
})
