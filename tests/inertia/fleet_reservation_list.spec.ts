import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockPost = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
  router: { post: mockPost },
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
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
  linkedInvoices: [],
}

const boats = [
  { id: 5, name: 'Mistral' },
  { id: 6, name: 'Bora Bora' },
]

describe('FleetReservationList', () => {
  test('hides table when reservations list is empty', () => {
    const wrapper = mount(FleetReservationList, {
      props: { reservations: [], boats, selectedBoatId: null },
    })
    expect(wrapper.find('table').exists()).toBe(false)
  })

  test('shows a create-reservation action in the empty state', () => {
    const wrapper = mount(FleetReservationList, {
      props: { reservations: [], boats, selectedBoatId: null },
    })
    expect(wrapper.text()).toContain('reservations.form.createTitle')
  })

  test('links directly to the selected boat when a filter is active', () => {
    const wrapper = mount(FleetReservationList, {
      props: { reservations: [], boats, selectedBoatId: 6 },
    })
    const link = wrapper.find('a[href="/boats/6/reservations#reservation-form"]')
    expect(link.exists()).toBe(true)
  })

  test('renders one row per reservation', () => {
    const wrapper = mount(FleetReservationList, {
      props: { reservations: [row], boats, selectedBoatId: null },
    })
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
  })

  test('shows boat name and client name', () => {
    const wrapper = mount(FleetReservationList, {
      props: { reservations: [row], boats, selectedBoatId: null },
    })
    expect(wrapper.text()).toContain('Mistral')
    expect(wrapper.text()).toContain('Alice Martin')
  })

  test('shows formatted dates', () => {
    const wrapper = mount(FleetReservationList, {
      props: { reservations: [row], boats, selectedBoatId: null },
    })
    expect(wrapper.text()).toContain('2026-06-01')
    expect(wrapper.text()).toContain('2026-06-07')
  })

  test('shows price with euro sign', () => {
    const wrapper = mount(FleetReservationList, {
      props: { reservations: [row], boats, selectedBoatId: null },
    })
    expect(wrapper.text()).toContain('900 €')
  })

  test('shows dash when price is null', () => {
    const wrapper = mount(FleetReservationList, {
      props: { reservations: [{ ...row, totalPrice: null }], boats, selectedBoatId: null },
    })
    expect(wrapper.text()).toContain('—')
  })

  test('status badge receives correct status prop', () => {
    const wrapper = mount(FleetReservationList, {
      props: { reservations: [row], boats, selectedBoatId: null },
    })
    expect(wrapper.find('[data-status="confirmed"]').exists()).toBe(true)
  })

  test('renders multiple rows', () => {
    const row2: BoatReservationRow = { ...row, id: 2, boatName: 'Bora Bora', clientName: 'Bob' }
    const wrapper = mount(FleetReservationList, {
      props: { reservations: [row, row2], boats, selectedBoatId: null },
    })
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(wrapper.text()).toContain('Bora Bora')
  })

  describe('create quote from reservation', () => {
    beforeEach(() => vi.clearAllMocks())

    test('shows the create-quote button and posts to the reservation route', async () => {
      const wrapper = mount(FleetReservationList, {
        props: { reservations: [row], boats, selectedBoatId: null, canCreateQuote: true },
      })
      const btn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('reservations.actions.createQuote'))
      expect(btn).toBeDefined()
      await btn!.trigger('click')
      expect(mockPost).toHaveBeenCalledWith(
        '/invoices/from-reservation/1',
        {},
        expect.objectContaining({ preserveScroll: true })
      )
    })

    test('hides the create-quote button when not enterprise', () => {
      const wrapper = mount(FleetReservationList, {
        props: { reservations: [row], boats, selectedBoatId: null, canCreateQuote: false },
      })
      const btn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('reservations.actions.createQuote'))
      expect(btn).toBeUndefined()
    })

    test('renders links to the linked documents', () => {
      const wrapper = mount(FleetReservationList, {
        props: {
          reservations: [{ ...row, linkedInvoices: [{ id: 42, number: 'DEV-000001' }] }],
          boats,
          selectedBoatId: null,
          canCreateQuote: true,
        },
      })
      const link = wrapper.find('a[href="/invoices/42"]')
      expect(link.exists()).toBe(true)
      expect(link.text()).toBe('DEV-000001')
    })
  })
})
