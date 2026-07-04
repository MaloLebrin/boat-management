import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/components/base/BaseBadge.vue', () => ({
  default: {
    template: '<span :data-variant="variant"><slot /></span>',
    props: ['variant'],
  },
}))

import ClientStatusBadge from '../../inertia/components/clients/ClientStatusBadge.vue'

test('active status uses success variant', () => {
  const wrapper = mount(ClientStatusBadge, { props: { status: 'active' } })
  expect(wrapper.find('[data-variant="success"]').exists()).toBe(true)
  expect(wrapper.text()).toContain('clients.status.active')
})

test('inactive status uses neutral variant', () => {
  const wrapper = mount(ClientStatusBadge, { props: { status: 'inactive' } })
  expect(wrapper.find('[data-variant="neutral"]').exists()).toBe(true)
  expect(wrapper.text()).toContain('clients.status.inactive')
})

test('blacklisted status uses danger variant', () => {
  const wrapper = mount(ClientStatusBadge, { props: { status: 'blacklisted' } })
  expect(wrapper.find('[data-variant="danger"]').exists()).toBe(true)
  expect(wrapper.text()).toContain('clients.status.blacklisted')
})
