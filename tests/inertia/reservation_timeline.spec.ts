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

  test('shows an empty state with a create-reservation action when entries list is empty', () => {
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
