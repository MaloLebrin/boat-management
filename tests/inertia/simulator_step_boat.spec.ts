import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import SimulatorStepBoat from '../../inertia/components/marketing/simulator/SimulatorStepBoat.vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

test('renders the four boat type buttons with an accessible name each', () => {
  const w = mount(SimulatorStepBoat, { props: { modelValue: {} } })
  const labels = w
    .findAll('button[aria-label^="simulator.boat_type_"]')
    .map((b) => b.attributes('aria-label'))
  expect(labels).toEqual([
    'simulator.boat_type_motorboat',
    'simulator.boat_type_sailboat',
    'simulator.boat_type_catamaran',
    'simulator.boat_type_rib',
  ])
})

test('CE navigation categories expose their full label as aria-label', () => {
  const w = mount(SimulatorStepBoat, { props: { modelValue: {} } })
  const labels = w
    .findAll('button[aria-label^="simulator.nav_category_"]')
    .map((b) => b.attributes('aria-label'))
  expect(labels).toEqual([
    'simulator.nav_category_a',
    'simulator.nav_category_b',
    'simulator.nav_category_c',
    'simulator.nav_category_d',
  ])
})

test('decorative boat type emoji is hidden from assistive tech', () => {
  const w = mount(SimulatorStepBoat, { props: { modelValue: {} } })
  const emoji = w.find(
    'button[aria-label="simulator.boat_type_motorboat"] span[aria-hidden="true"]'
  )
  expect(emoji.exists()).toBe(true)
})

test('emits the boat type on selection', async () => {
  const w = mount(SimulatorStepBoat, { props: { modelValue: {} } })
  await w.find('button[aria-label="simulator.boat_type_sailboat"]').trigger('click')
  const emitted = w.emitted('update:modelValue')
  expect(emitted).toBeTruthy()
  expect(emitted![0][0]).toMatchObject({ boatType: 'sailboat' })
})

// Regression: browser autofill sets lengthM then yearBuilt within the same tick,
// before props.modelValue propagates back. The two fields must merge, not clobber.
test('merges two fields updated in the same tick without losing the first', async () => {
  const w = mount(SimulatorStepBoat, { props: { modelValue: {} } })

  await w.find('#lengthM').setValue('10')
  await w.find('#yearBuilt').setValue('2005')

  const emitted = w.emitted('update:modelValue')!
  const last = emitted[emitted.length - 1][0]
  expect(last).toMatchObject({ lengthM: 10, yearBuilt: 2005 })
})

test('resyncs local state when the parent replaces modelValue (restart)', async () => {
  const w = mount(SimulatorStepBoat, {
    props: { modelValue: { lengthM: 12, boatType: 'sailboat' } },
  })

  await w.setProps({ modelValue: { hasDedicatedEngine: true } })
  await w.find('#lengthM').setValue('7')

  const emitted = w.emitted('update:modelValue')!
  const last = emitted[emitted.length - 1][0]
  expect(last).toEqual({ hasDedicatedEngine: true, lengthM: 7 })
})
