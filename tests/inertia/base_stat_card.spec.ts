import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseStatCard from '../../inertia/components/base/BaseStatCard.vue'

test('renders label and value', () => {
  const w = mount(BaseStatCard, { props: { label: 'Boats', value: '12', tone: 'info' } })
  expect(w.text()).toContain('Boats')
  expect(w.text()).toContain('12')
})
