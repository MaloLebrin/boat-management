import { mount } from '@vue/test-utils'
import { afterEach, test, expect } from 'vitest'
import BaseModal from '../../inertia/components/base/BaseModal.vue'

afterEach(() => {
  document.body.style.overflow = ''
})

test('renders content when open', () => {
  const w = mount(BaseModal, {
    props: { open: true, title: 'Modal' },
    slots: { default: 'Body' },
    global: { stubs: { teleport: true } },
  })
  expect(w.text()).toContain('Modal')
  expect(w.text()).toContain('Body')
})

test('locks body scroll while open and releases it on close', async () => {
  const w = mount(BaseModal, {
    props: { open: false },
    global: { stubs: { teleport: true } },
  })
  await w.setProps({ open: true })
  expect(document.body.style.overflow).toBe('hidden')

  await w.setProps({ open: false })
  expect(document.body.style.overflow).toBe('')
})

test('releases body scroll when unmounted while still open (#358)', () => {
  const w = mount(BaseModal, {
    props: { open: true },
    global: { stubs: { teleport: true } },
  })
  expect(document.body.style.overflow).toBe('hidden')

  w.unmount()
  expect(document.body.style.overflow).toBe('')
})
