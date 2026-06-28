import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import BaseSegmentedControl from '../../inertia/components/base/BaseSegmentedControl.vue'

const options = [
  { value: 'all', label: 'All' },
  { value: 'engine', label: 'Engine' },
  { value: 'sail', label: 'Sail' },
]

test('renders all options', () => {
  const w = mount(BaseSegmentedControl, { props: { modelValue: 'all', options } })
  const buttons = w.findAll('button')
  expect(buttons).toHaveLength(3)
  expect(buttons[0].text()).toBe('All')
  expect(buttons[1].text()).toBe('Engine')
  expect(buttons[2].text()).toBe('Sail')
})

test('active option has brand style', () => {
  const w = mount(BaseSegmentedControl, { props: { modelValue: 'engine', options } })
  const buttons = w.findAll('button')
  expect(buttons[1].classes()).toContain('bg-brand')
  expect(buttons[0].classes()).not.toContain('bg-brand')
})

test('emits update:modelValue on click', async () => {
  const w = mount(BaseSegmentedControl, { props: { modelValue: 'all', options } })
  await w.findAll('button')[2].trigger('click')
  expect(w.emitted('update:modelValue')?.[0]).toEqual(['sail'])
})

test('emits update:modelValue with numeric value', async () => {
  const numOptions = [
    { value: 1, label: 'One' },
    { value: 2, label: 'Two' },
  ]
  const w = mount(BaseSegmentedControl, { props: { modelValue: 1, options: numOptions } })
  await w.findAll('button')[1].trigger('click')
  expect(w.emitted('update:modelValue')?.[0]).toEqual([2])
})
