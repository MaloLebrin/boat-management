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

import ReservationStatusBadge from '../../inertia/components/reservations/ReservationStatusBadge.vue'

test('option status uses warning variant', () => {
  const wrapper = mount(ReservationStatusBadge, { props: { status: 'option' } })
  expect(wrapper.find('[data-variant="warning"]').exists()).toBe(true)
})

test('confirmed status uses success variant', () => {
  const wrapper = mount(ReservationStatusBadge, { props: { status: 'confirmed' } })
  expect(wrapper.find('[data-variant="success"]').exists()).toBe(true)
})

test('cancelled status uses neutral variant', () => {
  const wrapper = mount(ReservationStatusBadge, { props: { status: 'cancelled' } })
  expect(wrapper.find('[data-variant="neutral"]').exists()).toBe(true)
})
