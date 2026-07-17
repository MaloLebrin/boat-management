import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

import ReservationCreateButton from '../../inertia/components/reservations/ReservationCreateButton.vue'

const boats = [
  { id: 5, name: 'Mistral' },
  { id: 6, name: 'Bora Bora' },
]

describe('ReservationCreateButton', () => {
  test('renders a disabled button when the org has no boats', () => {
    const wrapper = mount(ReservationCreateButton, { props: { boats: [], selectedBoatId: null } })
    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.find('button[disabled]').exists()).toBe(true)
  })

  test('links directly to the only boat when there is exactly one', () => {
    const wrapper = mount(ReservationCreateButton, {
      props: { boats: [boats[0]], selectedBoatId: null },
    })
    const link = wrapper.find('a')
    expect(link.attributes('href')).toBe('/boats/5/reservations#reservation-form')
  })

  test('links directly to the selected boat when a filter is active, even with several boats', () => {
    const wrapper = mount(ReservationCreateButton, { props: { boats, selectedBoatId: 6 } })
    const link = wrapper.find('a')
    expect(link.attributes('href')).toBe('/boats/6/reservations#reservation-form')
  })

  test('shows a boat picker dropdown when several boats exist and none is selected', async () => {
    const wrapper = mount(ReservationCreateButton, { props: { boats, selectedBoatId: null } })
    // No single direct link when the target boat is ambiguous.
    expect(wrapper.find('a[href^="/boats/"]').exists()).toBe(false)

    await wrapper.find('button').trigger('click')
    const links = wrapper.findAll('a[role="menuitem"]')
    expect(links).toHaveLength(2)
    expect(links[0].attributes('href')).toBe('/boats/5/reservations#reservation-form')
    expect(links[1].attributes('href')).toBe('/boats/6/reservations#reservation-form')
  })
})
