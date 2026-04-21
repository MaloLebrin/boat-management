import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseModal from '../../inertia/components/base/BaseModal.vue'

test('renders content when open', () => {
  const w = mount(BaseModal, {
    props: { open: true, title: 'Modal' },
    slots: { default: 'Body' },
    global: { stubs: { teleport: true } },
  })
  expect(w.text()).toContain('Modal')
  expect(w.text()).toContain('Body')
})
