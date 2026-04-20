import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseBadge from '../../inertia/components/base/BaseBadge.vue'

test('renders slot text', () => {
  const w = mount(BaseBadge, { slots: { default: 'Status' } })
  expect(w.text()).toBe('Status')
})

test('applies neutral variant classes by default', () => {
  const w = mount(BaseBadge, { slots: { default: 'N' } })
  expect(w.classes().join(' ')).toContain('bg-lilac-100')
})

test('applies success variant classes', () => {
  const w = mount(BaseBadge, { props: { variant: 'success' }, slots: { default: 'OK' } })
  expect(w.classes().join(' ')).toContain('text-mint-800')
})
