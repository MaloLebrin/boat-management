import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseHeading from '../../inertia/components/base/BaseHeading.vue'

test('renders h1 for level 1', () => {
  const w = mount(BaseHeading, { props: { level: '1' }, slots: { default: 'Title' } })
  expect(w.find('h1').exists()).toBe(true)
  expect(w.find('h1').text()).toBe('Title')
})

test('renders h2 for level 2', () => {
  const w = mount(BaseHeading, { props: { level: '2' }, slots: { default: 'Sub' } })
  expect(w.find('h2').exists()).toBe(true)
})

test('renders custom element when as prop is set', () => {
  const w = mount(BaseHeading, { props: { level: '1', as: 'h2' }, slots: { default: 'T' } })
  expect(w.find('h2').exists()).toBe(true)
  expect(w.find('h1').exists()).toBe(false)
})
