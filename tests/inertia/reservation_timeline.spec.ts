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

import ReservationTimeline from '../../inertia/components/reservations/ReservationTimeline.vue'
import type { FleetBoatCalendarEntry } from '../../shared/types/reservation'

const entries: FleetBoatCalendarEntry[] = [
  { boatId: 1, boatName: 'Mistral', reservations: [] },
  { boatId: 2, boatName: 'Bora Bora', reservations: [] },
]

describe('ReservationTimeline', () => {
  test('renders one row per fleet entry', () => {
    const wrapper = mount(ReservationTimeline, { props: { calendarEntries: entries } })
    expect(wrapper.findAll('[data-boat-id]')).toHaveLength(2)
  })

  test('renders no rows when entries list is empty', () => {
    const wrapper = mount(ReservationTimeline, { props: { calendarEntries: [] } })
    expect(wrapper.findAll('[data-boat-id]')).toHaveLength(0)
  })

  test('shows prev and next navigation buttons', () => {
    const wrapper = mount(ReservationTimeline, { props: { calendarEntries: entries } })
    expect(wrapper.findAll('button')).toHaveLength(2)
  })

  test('navigation buttons respond to clicks without error', async () => {
    const wrapper = mount(ReservationTimeline, { props: { calendarEntries: entries } })
    await wrapper.findAll('button')[0].trigger('click')
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.findAll('[data-boat-id]')).toHaveLength(2)
  })

  test('day headers are rendered for each day of the month', () => {
    const wrapper = mount(ReservationTimeline, { props: { calendarEntries: entries } })
    // At least 28 day cells in the header row
    const dayCells = wrapper.findAll('.w-8.shrink-0.text-center')
    expect(dayCells.length).toBeGreaterThanOrEqual(28)
  })
})
