import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseSkeleton from '../../inertia/components/base/BaseSkeleton.vue'

test('renders a shimmer container', () => {
  const w = mount(BaseSkeleton)
  expect(w.attributes('aria-hidden')).toBe('true')
})
