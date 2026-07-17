import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  Head: { template: '<div><slot /></div>' },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/components/base/BaseBreadcrumb.vue', () => ({ default: { template: '<div />' } }))
vi.mock('~/components/reservations/ReservationCalendar.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('~/components/reservations/ReservationForm.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('~/components/reservations/ReservationList.vue', () => ({
  default: { template: '<div />' },
}))

import BoatReservations from '../../inertia/pages/boats/reservations.vue'

const baseProps = {
  boat: { id: 5, name: 'Mistral' },
  reservations: [],
  canManage: true,
  boatPricing: null,
  pricingSeasons: [],
  clientOptions: [],
}

let scrollIntoView: ReturnType<typeof vi.fn>
let wrapper: ReturnType<typeof mount> | null = null

beforeEach(() => {
  scrollIntoView = vi.fn()
  Element.prototype.scrollIntoView = scrollIntoView
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  window.history.pushState(null, '', '/')
})

test('scrolls to the reservation form when the URL targets it', () => {
  window.history.pushState(null, '', '/boats/5/reservations#reservation-form')
  wrapper = mount(BoatReservations, { props: baseProps, attachTo: document.body })
  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
})

test('does not scroll when the URL has no anchor', () => {
  window.history.pushState(null, '', '/boats/5/reservations')
  wrapper = mount(BoatReservations, { props: baseProps, attachTo: document.body })
  expect(scrollIntoView).not.toHaveBeenCalled()
})
