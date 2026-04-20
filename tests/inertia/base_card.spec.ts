import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseCard from '../../inertia/components/base/BaseCard.vue'

test('renders default slot content', () => {
  const w = mount(BaseCard, { slots: { default: '<p class="body">Card body</p>' } })
  expect(w.find('.body').text()).toBe('Card body')
})

test('renders header slot when provided', () => {
  const w = mount(BaseCard, {
    slots: {
      header: '<span class="hdr">Title</span>',
      default: '<p>Body</p>',
    },
  })
  expect(w.find('.hdr').text()).toBe('Title')
})

test('renders footer slot when provided', () => {
  const w = mount(BaseCard, {
    slots: {
      default: '<p>Main</p>',
      footer: '<span class="ft">Footer</span>',
    },
  })
  expect(w.find('.ft').text()).toBe('Footer')
})
