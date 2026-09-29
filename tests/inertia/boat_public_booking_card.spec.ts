import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockPatch = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  router: { patch: mockPatch },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}(${Object.values(params).join('|')})` : key,
    locale: { value: 'en' },
  }),
}))

vi.mock('~/components/base/BaseToggle.vue', () => ({
  default: {
    template:
      '<input type="checkbox" data-testid="toggle" :checked="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue', 'disabled', 'label', 'id'],
    emits: ['update:modelValue'],
  },
}))

import BoatPublicBookingCard from '../../inertia/components/reservations/public_booking/BoatPublicBookingCard.vue'

/** Encart « Réservation en ligne » de l'onglet Réservations d'un bateau (#881). */
describe('BoatPublicBookingCard (#881)', () => {
  beforeEach(() => mockPatch.mockReset())

  const open = {
    enabled: true,
    url: 'https://app.test/book/acme/ondine',
    fleetUrl: 'https://app.test/book/acme',
    canManage: true,
  }

  test('an open page shows its link and the fleet page', () => {
    const wrapper = mount(BoatPublicBookingCard, { props: { boatId: 5, settings: open } })
    expect(wrapper.find('input#public-booking-url').element).toBeDefined()
    expect(wrapper.html()).toContain('https://app.test/book/acme/ondine')
    expect(wrapper.text()).toContain(
      'reservations.publicBooking.fleetHint(https://app.test/book/acme)'
    )
  })

  test('a closed page says so, without a link', () => {
    const wrapper = mount(BoatPublicBookingCard, {
      props: { boatId: 5, settings: { ...open, enabled: false } },
    })
    expect(wrapper.text()).toContain('reservations.publicBooking.closed')
    expect(wrapper.html()).not.toContain('https://app.test/book/acme/ondine')
  })

  test('the toggle patches the boat with an Inertia visit', async () => {
    const wrapper = mount(BoatPublicBookingCard, {
      props: { boatId: 5, settings: { ...open, enabled: false } },
    })
    const toggle = wrapper.find('[data-testid="toggle"]')
    ;(toggle.element as HTMLInputElement).checked = true
    await toggle.trigger('change')
    expect(mockPatch).toHaveBeenCalledWith(
      '/boats/5/public-booking',
      { enabled: true },
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('without the manage right, no toggle', () => {
    const wrapper = mount(BoatPublicBookingCard, {
      props: { boatId: 5, settings: { ...open, canManage: false } },
    })
    expect(wrapper.find('[data-testid="toggle"]').exists()).toBe(false)
  })
})
