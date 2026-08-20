import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button @click="$emit(\'click\')"><slot /></button>',
    props: ['variant', 'size'],
    emits: ['click'],
  },
}))

vi.mock('~/components/reservations/ReservationTimelineRow.vue', () => ({
  default: {
    template: '<div :data-boat-id="String(entry.boatId)" />',
    props: ['entry', 'days', 'monthStart', 'monthEnd'],
  },
}))

vi.mock('~/components/reservations/ReservationCreateButton.vue', () => ({
  default: {
    template: '<button data-testid="create-reservation" />',
    props: ['boats', 'selectedBoatId'],
  },
}))

import ReservationTimeline from '../../inertia/components/reservations/ReservationTimeline.vue'
import type { FleetBoatCalendarEntry } from '../../shared/types/reservation'

const boats = [
  { id: 1, name: 'Mistral' },
  { id: 2, name: 'Bora Bora' },
]

const reservation = {
  id: 1,
  boatId: 1,
  boatName: 'Mistral',
  organizationId: 1,
  clientId: null,
  status: 'confirmed',
  startsAt: '2026-03-02T10:00:00.000+00:00',
  endsAt: '2026-03-06T10:00:00.000+00:00',
  clientName: 'Client A',
  clientEmail: null,
  clientPhone: null,
  notes: null,
  totalPrice: null,
  createdAt: '2026-03-01T10:00:00.000+00:00',
  linkedInvoices: [],
} satisfies FleetBoatCalendarEntry['reservations'][number]

const entries: FleetBoatCalendarEntry[] = [
  { boatId: 1, boatName: 'Mistral', reservations: [] },
  { boatId: 2, boatName: 'Bora Bora', reservations: [] },
]

describe('ReservationTimeline', () => {
  test('renders one row per fleet entry', () => {
    const wrapper = mount(ReservationTimeline, {
      props: { calendarEntries: entries, boats, selectedBoatId: null },
    })
    expect(wrapper.findAll('[data-boat-id]')).toHaveLength(2)
  })

  test('renders a row for a boat with no reservation at all (#477)', () => {
    const wrapper = mount(ReservationTimeline, {
      props: {
        calendarEntries: [
          { boatId: 1, boatName: 'Mistral', reservations: [reservation] },
          { boatId: 2, boatName: 'Bora Bora', reservations: [] },
          { boatId: 3, boatName: 'Cyclone', reservations: [] },
        ],
        boats,
        selectedBoatId: null,
      },
    })
    const rows = wrapper.findAll('[data-boat-id]')
    expect(rows).toHaveLength(3)
    expect(rows.map((r) => r.attributes('data-boat-id'))).toEqual(['1', '2', '3'])
    expect(wrapper.find('[data-testid="create-reservation"]').exists()).toBe(false)
  })

  test('shows an empty state with a create-reservation action when the fleet has no boat', () => {
    const wrapper = mount(ReservationTimeline, {
      props: { calendarEntries: [], boats, selectedBoatId: null },
    })
    expect(wrapper.findAll('[data-boat-id]')).toHaveLength(0)
    expect(wrapper.find('[data-testid="create-reservation"]').exists()).toBe(true)
  })

  test('shows prev and next navigation buttons', () => {
    const wrapper = mount(ReservationTimeline, {
      props: { calendarEntries: entries, boats, selectedBoatId: null },
    })
    expect(wrapper.findAll('button')).toHaveLength(2)
  })

  test('navigation buttons respond to clicks without error', async () => {
    const wrapper = mount(ReservationTimeline, {
      props: { calendarEntries: entries, boats, selectedBoatId: null },
    })
    await wrapper.findAll('button')[0].trigger('click')
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.findAll('[data-boat-id]')).toHaveLength(2)
  })

  test('day headers are rendered for each day of the month', () => {
    const wrapper = mount(ReservationTimeline, {
      props: { calendarEntries: entries, boats, selectedBoatId: null },
    })
    // At least 28 day cells in the header row
    const dayCells = wrapper.findAll('.w-8.shrink-0.text-center')
    expect(dayCells.length).toBeGreaterThanOrEqual(28)
  })
})
