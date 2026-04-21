import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseInput from '../../inertia/components/base/BaseInput.vue'

test('renders label and input', () => {
  const w = mount(BaseInput, { props: { id: 'name', label: 'Name', modelValue: 'A' } })
  expect(w.find('label').text()).toBe('Name')
  expect(w.find('input').exists()).toBe(true)
})

test('emits update:modelValue on input', async () => {
  const w = mount(BaseInput, { props: { id: 'n', label: 'N', modelValue: '' } })
  await w.find('input').setValue('Hello')
  expect(w.emitted('update:modelValue')?.[0]).toEqual(['Hello'])
})

test('renders trailing slot', () => {
  const w = mount(BaseInput, {
    props: { id: 'pw', label: 'Password', modelValue: '' },
    slots: { trailing: '<button type="button">Show</button>' },
  })
  expect(w.text()).toContain('Show')
})
