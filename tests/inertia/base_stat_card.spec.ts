import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseStatCard from '../../inertia/components/base/BaseStatCard.vue'

test('renders label and value', () => {
  const w = mount(BaseStatCard, { props: { label: 'Boats', value: '12', tone: 'info' } })
  expect(w.text()).toContain('Boats')
  expect(w.text()).toContain('12')
})

test('renders the tone as badge text', () => {
  const w = mount(BaseStatCard, { props: { label: 'Tasks', value: '5', tone: 'success' } })
  expect(w.text()).toContain('success')
})

test('renders delta text when provided', () => {
  const w = mount(BaseStatCard, { props: { label: 'Revenue', value: '1 000 €', delta: '+12 %' } })
  expect(w.text()).toContain('+12 %')
})

test('does not render delta element when delta is omitted', () => {
  const w = mount(BaseStatCard, { props: { label: 'Revenue', value: '1 000 €' } })
  expect(w.text()).not.toContain('+')
  expect(w.find('p.text-sm.text-fg-subtle').exists()).toBe(false)
})

test('defaults tone to neutral when not specified', () => {
  const w = mount(BaseStatCard, { props: { label: 'Users', value: '3' } })
  expect(w.text()).toContain('neutral')
})

test('renders warning tone badge', () => {
  const w = mount(BaseStatCard, { props: { label: 'Alerts', value: '2', tone: 'warning' } })
  expect(w.text()).toContain('warning')
})
