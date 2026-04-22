import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import BaseButton from '../../inertia/components/base/BaseButton.vue'

vi.mock('@adonisjs/inertia/vue', () => {
  return {
    Link: {
      name: 'MockInertiaLink',
      props: {
        route: { type: String, required: false },
        method: { type: String, required: false },
        preserveScroll: { type: Boolean, required: false },
        preserveState: { type: Boolean, required: false },
        replace: { type: Boolean, required: false },
      },
      template: '<a data-link route="route"><slot /></a>',
    },
  }
})

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
  expect(w.classes().join(' ')).toContain('bg-red-200')
})

test('renders as anchor when href is provided', () => {
  const w = mount(BaseButton, { props: { href: '/boats' }, slots: { default: 'Boats' } })
  expect(w.element.tagName.toLowerCase()).toBe('a')
  expect(w.attributes('href')).toBe('/boats')
})

test('renders as inertia Link when route is provided', () => {
  const w = mount(BaseButton, { props: { route: 'dashboard' }, slots: { default: 'Dashboard' } })
  expect(w.element.tagName.toLowerCase()).toBe('a')
  expect(w.attributes('data-link')).toBeDefined()
})

test('prevents navigation when disabled in link mode', async () => {
  const w = mount(BaseButton, {
    props: { href: '/boats', disabled: true },
    slots: { default: 'Boats' },
  })
  const event = new MouseEvent('click', { bubbles: true, cancelable: true })
  w.element.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(true)
  expect(w.attributes('aria-disabled')).toBe('true')
})
