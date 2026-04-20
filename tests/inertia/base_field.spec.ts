import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseField from '../../inertia/components/base/BaseField.vue'

test('renders label when provided', () => {
  const w = mount(BaseField, {
    props: { label: 'Ship name', htmlFor: 'ship' },
    slots: { default: '<input id="ship" />' },
  })
  expect(w.find('label').text()).toBe('Ship name')
})

test('renders hint when no error', () => {
  const w = mount(BaseField, {
    props: { label: 'L', hint: 'Optional hint', htmlFor: 'x' },
    slots: { default: '<input id="x" />' },
  })
  expect(w.text()).toContain('Optional hint')
})

test('shows error instead of hint when error is set', () => {
  const w = mount(BaseField, {
    props: { label: 'L', hint: 'Hint', error: 'Required', htmlFor: 'y' },
    slots: { default: '<input id="y" />' },
  })
  expect(w.text()).toContain('Required')
  expect(w.text()).not.toContain('Hint')
})
