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
