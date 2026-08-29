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

import ReservationTypeBadge from '../../inertia/components/reservations/ReservationTypeBadge.vue'

test.each([
  ['bareboat', 'info'],
  ['skippered', 'success'],
  ['day_charter', 'warning'],
  ['cabin', 'neutral'],
  ['other', 'empty'],
] as const)('%s charter type uses the %s variant', (type, variant) => {
  const wrapper = mount(ReservationTypeBadge, { props: { type } })
  expect(wrapper.find(`[data-variant="${variant}"]`).exists()).toBe(true)
  expect(wrapper.text()).toBe(`reservations.types.${type}`)
})

test('a reservation without a type renders a dash, not a misleading badge (#585)', () => {
  const wrapper = mount(ReservationTypeBadge, { props: { type: null } })
  expect(wrapper.find('[data-variant]').exists()).toBe(false)
  expect(wrapper.text()).toBe('—')
})
