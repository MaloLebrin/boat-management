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

import ReservationCalendar from '../../inertia/components/reservations/ReservationCalendar.vue'
import type { BoatReservationRow } from '../../shared/types/reservation'

function currentMonthIso(day: number): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-${String(day).padStart(2, '0')}`
}

const res: BoatReservationRow = {
  id: 1,
  boatId: 5,
  boatName: 'Mistral',
  organizationId: 10,
  status: 'confirmed',
  startsAt: currentMonthIso(5),
  endsAt: currentMonthIso(8),
  clientName: 'Alice',
  clientEmail: null,
  clientPhone: null,
  notes: null,
  totalPrice: null,
  createdAt: currentMonthIso(1),
}

describe('ReservationCalendar', () => {
  test('hides calendar grid when no reservations', () => {
    const wrapper = mount(ReservationCalendar, { props: { reservations: [] } })
    expect(wrapper.find('.grid-cols-7').exists()).toBe(false)
  })

  test('renders calendar grid when reservations are present', () => {
    const wrapper = mount(ReservationCalendar, { props: { reservations: [res] } })
    expect(wrapper.find('.grid-cols-7').exists()).toBe(true)
  })

  test('shows client name on reservation days', () => {
    const wrapper = mount(ReservationCalendar, { props: { reservations: [res] } })
    expect(wrapper.text()).toContain('Alice')
  })

  test('shows overflow indicator when more than 2 reservations on a day', () => {
    const extras: BoatReservationRow[] = Array.from({ length: 3 }, (_, i) => ({
      ...res,
      id: i + 1,
      clientName: `Client ${i + 1}`,
    }))
    const wrapper = mount(ReservationCalendar, { props: { reservations: extras } })
    // The "+n more" div has classes text-xs text-fg-muted
    expect(wrapper.find('.text-xs.text-fg-muted').exists()).toBe(true)
  })

  test('renders prev and next navigation buttons', () => {
    const wrapper = mount(ReservationCalendar, { props: { reservations: [] } })
    expect(wrapper.findAll('button')).toHaveLength(2)
  })

  test('navigation buttons change the displayed month', async () => {
    const wrapper = mount(ReservationCalendar, { props: { reservations: [] } })
    const initialLabel = wrapper.find('h2').text()
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.find('h2').text()).not.toBe(initialLabel)
  })

  test('applies confirmed pill class on reservation days', () => {
    const wrapper = mount(ReservationCalendar, { props: { reservations: [res] } })
    expect(wrapper.find('.bg-mint-100').exists()).toBe(true)
  })

  test('applies option pill class for option status', () => {
    const optionRes = { ...res, status: 'option' as const }
    const wrapper = mount(ReservationCalendar, { props: { reservations: [optionRes] } })
    expect(wrapper.find('.bg-peach-100').exists()).toBe(true)
  })
})
