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

test('renders error from errors object using name', () => {
  const w = mount(BaseInput, {
    props: {
      id: 'email',
      name: 'email',
      label: 'Email',
      modelValue: '',
      errors: { email: 'Invalid email' },
    },
  })
  expect(w.get('[role="alert"]').text()).toBe('Invalid email')
})

test('renders input with type number and passes through min/step', () => {
  const w = mount(BaseInput, {
    props: { id: 'qty', label: 'Qty', type: 'number', modelValue: '10', step: '0.1', min: '0' },
  })
  const input = w.find('input')
  expect(input.attributes('type')).toBe('number')
  expect(input.attributes('step')).toBe('0.1')
  expect(input.attributes('min')).toBe('0')
})

test('passes through maxlength attr to inner input', () => {
  const w = mount(BaseInput, {
    props: { id: 's', label: 'S', type: 'text', modelValue: '' },
    attrs: { maxlength: '500' },
  })
  expect(w.find('input').attributes('maxlength')).toBe('500')
})

test('emits string value on input for type number', async () => {
  const w = mount(BaseInput, { props: { id: 'qty', label: 'Qty', type: 'number' } })
  await w.find('input').setValue('42.5')
  expect(w.emitted('update:modelValue')?.[0]).toEqual(['42.5'])
})

test('renders input with type date', () => {
  const w = mount(BaseInput, {
    props: { id: 'dt', label: 'Date', type: 'date', modelValue: '2024-01-01' },
  })
  expect(w.find('input').attributes('type')).toBe('date')
})

test('renders input with type datetime-local', () => {
  const w = mount(BaseInput, {
    props: { id: 'dlt', label: 'Datetime', type: 'datetime-local', modelValue: '2024-01-01T10:00' },
  })
  expect(w.find('input').attributes('type')).toBe('datetime-local')
})
