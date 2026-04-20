import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseButton from '../../inertia/components/base/BaseButton.vue'

test('renders slot content', () => {
  const w = mount(BaseButton, { slots: { default: 'Submit' } })
  expect(w.text()).toContain('Submit')
})

test('applies primary variant classes by default', () => {
  const w = mount(BaseButton, { slots: { default: 'Go' } })
  expect(w.classes().join(' ')).toContain('bg-brand')
})

test('respects disabled prop', () => {
  const w = mount(BaseButton, { props: { disabled: true }, slots: { default: 'X' } })
  expect(w.attributes('disabled')).toBeDefined()
})

test('uses danger variant classes when variant is danger', () => {
  const w = mount(BaseButton, { props: { variant: 'danger' }, slots: { default: 'Del' } })
  expect(w.classes().join(' ')).toContain('bg-danger')
})
