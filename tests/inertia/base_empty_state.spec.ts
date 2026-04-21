import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseEmptyState from '../../inertia/components/base/BaseEmptyState.vue'

test('renders title', () => {
  const w = mount(BaseEmptyState, { props: { title: 'Nothing here' } })
  expect(w.text()).toContain('Nothing here')
})
