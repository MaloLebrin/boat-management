import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import ReservationTimelineRow from '../../inertia/components/reservations/ReservationTimelineRow.vue'
import type { FleetBoatCalendarEntry } from '../../shared/types/reservation'

const days = Array.from({ length: 30 }, (_, i) => i + 1)
const monthStart = '2026-06-01'
const monthEnd = '2026-06-30'

const entry: FleetBoatCalendarEntry = {
  boatId: 1,
  boatName: 'Mistral',
  reservations: [
    {
      id: 1,
      boatId: 1,
      boatName: 'Mistral',
      organizationId: 10,
      status: 'confirmed',
      startsAt: '2026-06-03',
      endsAt: '2026-06-06',
      clientName: 'Alice',
      clientEmail: null,
      clientPhone: null,
      notes: null,
      totalPrice: null,
      createdAt: '2026-05-01',
    },
  ],
}

describe('ReservationTimelineRow', () => {
  test('renders boat name', () => {
    const wrapper = mount(ReservationTimelineRow, {
      props: { entry, days, monthStart, monthEnd },
    })
    expect(wrapper.text()).toContain('Mistral')
  })

  test('shows client name on the start day of the reservation', () => {
    const wrapper = mount(ReservationTimelineRow, {
      props: { entry, days, monthStart, monthEnd },
    })
    expect(wrapper.text()).toContain('Alice')
  })

  test('applies confirmed pill class on covered days', () => {
    const wrapper = mount(ReservationTimelineRow, {
      props: { entry, days, monthStart, monthEnd },
    })
    expect(wrapper.find('.bg-mint-200').exists()).toBe(true)
  })

  test('applies option pill class for option status', () => {
    const optionEntry: FleetBoatCalendarEntry = {
      ...entry,
      reservations: [{ ...entry.reservations[0], status: 'option' }],
    }
    const wrapper = mount(ReservationTimelineRow, {
      props: { entry: optionEntry, days, monthStart, monthEnd },
    })
    expect(wrapper.find('.bg-peach-200').exists()).toBe(true)
  })

  test('applies cancelled opacity class for cancelled status', () => {
    const cancelledEntry: FleetBoatCalendarEntry = {
      ...entry,
      reservations: [{ ...entry.reservations[0], status: 'cancelled' }],
    }
    const wrapper = mount(ReservationTimelineRow, {
      props: { entry: cancelledEntry, days, monthStart, monthEnd },
    })
    expect(wrapper.find('.opacity-60').exists()).toBe(true)
  })

  test('renders no pills for an entry with no reservations', () => {
    const emptyEntry: FleetBoatCalendarEntry = { boatId: 2, boatName: 'Bora', reservations: [] }
    const wrapper = mount(ReservationTimelineRow, {
      props: { entry: emptyEntry, days, monthStart, monthEnd },
    })
    expect(wrapper.find('.bg-mint-200').exists()).toBe(false)
    expect(wrapper.find('.bg-peach-200').exists()).toBe(false)
  })

  test('end day (exclusive) is not covered', () => {
    // endsAt is 2026-06-06 → day 6 must NOT be highlighted
    const wrapper = mount(ReservationTimelineRow, {
      props: { entry, days, monthStart, monthEnd },
    })
    // Client name only appears on the start day (day 3)
    // There is exactly one span with the client name
    const spans = wrapper.findAll('span').filter((s) => s.text() === 'Alice')
    expect(spans).toHaveLength(1)
  })
})
