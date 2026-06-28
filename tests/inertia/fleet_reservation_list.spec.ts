import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/composables/use_reservation_format', () => ({
  useReservationFormat: () => ({ formatDate: (s: string) => s.slice(0, 10) }),
}))

vi.mock('~/components/reservations/ReservationStatusBadge.vue', () => ({
  default: {
    template: '<span :data-status="status" />',
    props: ['status'],
  },
}))

import FleetReservationList from '../../inertia/components/reservations/FleetReservationList.vue'
import type { BoatReservationRow } from '../../shared/types/reservation'

const row: BoatReservationRow = {
  id: 1,
  boatId: 5,
  boatName: 'Mistral',
  organizationId: 10,
  status: 'confirmed',
  startsAt: '2026-06-01T10:00:00.000Z',
  endsAt: '2026-06-07T10:00:00.000Z',
  clientName: 'Alice Martin',
  clientEmail: null,
  clientPhone: null,
  notes: null,
  totalPrice: '900',
  createdAt: '2026-05-01T00:00:00.000Z',
}

describe('FleetReservationList', () => {
  test('hides table when reservations list is empty', () => {
    const wrapper = mount(FleetReservationList, { props: { reservations: [] } })
    expect(wrapper.find('table').exists()).toBe(false)
  })

  test('renders one row per reservation', () => {
    const wrapper = mount(FleetReservationList, { props: { reservations: [row] } })
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
  })

  test('shows boat name and client name', () => {
    const wrapper = mount(FleetReservationList, { props: { reservations: [row] } })
    expect(wrapper.text()).toContain('Mistral')
    expect(wrapper.text()).toContain('Alice Martin')
  })

  test('shows formatted dates', () => {
    const wrapper = mount(FleetReservationList, { props: { reservations: [row] } })
    expect(wrapper.text()).toContain('2026-06-01')
    expect(wrapper.text()).toContain('2026-06-07')
  })

  test('shows price with euro sign', () => {
    const wrapper = mount(FleetReservationList, { props: { reservations: [row] } })
    expect(wrapper.text()).toContain('900 €')
  })

  test('shows dash when price is null', () => {
    const wrapper = mount(FleetReservationList, {
      props: { reservations: [{ ...row, totalPrice: null }] },
    })
    expect(wrapper.text()).toContain('—')
  })

  test('status badge receives correct status prop', () => {
    const wrapper = mount(FleetReservationList, { props: { reservations: [row] } })
    expect(wrapper.find('[data-status="confirmed"]').exists()).toBe(true)
  })

  test('renders multiple rows', () => {
    const row2: BoatReservationRow = { ...row, id: 2, boatName: 'Bora Bora', clientName: 'Bob' }
    const wrapper = mount(FleetReservationList, { props: { reservations: [row, row2] } })
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(wrapper.text()).toContain('Bora Bora')
  })
})
