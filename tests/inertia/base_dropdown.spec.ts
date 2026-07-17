import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseDropdown from '../../inertia/components/base/BaseDropdown.vue'

test('toggles menu on click', async () => {
  const w = mount(BaseDropdown, {
    slots: {
      trigger: 'Open',
      default: '<div class="menu">Item</div>',
    },
  })
  expect(w.find('.menu').exists()).toBe(false)
  await w.find('button').trigger('click')
  expect(w.find('.menu').exists()).toBe(true)
})

test('variant="primary" applies the brand-colored trigger button (#365)', () => {
  const w = mount(BaseDropdown, {
    props: { variant: 'primary' },
    slots: { trigger: 'Open' },
  })
  expect(w.find('button').classes()).toContain('bg-brand')
})

test('default variant keeps the neutral bordered trigger button', () => {
  const w = mount(BaseDropdown, {
    slots: { trigger: 'Open' },
  })
  expect(w.find('button').classes()).not.toContain('bg-brand')
  expect(w.find('button').classes()).toContain('border')
})
