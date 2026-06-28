import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseTextarea from '../../inertia/components/base/BaseTextarea.vue'

test('renders textarea with rows', () => {
  const w = mount(BaseTextarea, { props: { id: 't', label: 'Notes', rows: 6 } })
  expect(w.find('textarea').attributes('rows')).toBe('6')
})

test('emits update:modelValue on input', async () => {
  const w = mount(BaseTextarea, { props: { id: 't2', label: 'N', modelValue: '' } })
  await w.find('textarea').setValue('Hi')
  expect(w.emitted('update:modelValue')?.[0]).toEqual(['Hi'])
})

test('forwards maxlength to textarea', () => {
  const w = mount(BaseTextarea, { props: { id: 't', label: 'N', maxlength: 500 } })
  expect(w.find('textarea').attributes('maxlength')).toBe('500')
})

test('forwards required to textarea', () => {
  const w = mount(BaseTextarea, { props: { id: 't', label: 'N', required: true } })
  expect(w.find('textarea').attributes('required')).toBeDefined()
})

test('renders error from errors object using name', () => {
  const w = mount(BaseTextarea, {
    props: {
      id: 'notes',
      name: 'notes',
      label: 'Notes',
      modelValue: '',
      errors: { notes: 'Too long' },
    },
  })
  expect(w.get('[role="alert"]').text()).toBe('Too long')
})
