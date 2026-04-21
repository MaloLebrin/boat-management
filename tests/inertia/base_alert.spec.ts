import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseAlert from '../../inertia/components/base/BaseAlert.vue'

test('renders title and slot', () => {
  const w = mount(BaseAlert, {
    props: { title: 'Heads up', variant: 'info' },
    slots: { default: 'Message' },
  })
  expect(w.text()).toContain('Heads up')
  expect(w.text()).toContain('Message')
})
