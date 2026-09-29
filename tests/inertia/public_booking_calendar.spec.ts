import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key, locale: { value: 'en' } }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['variant', 'size', 'disabled'],
    emits: ['click'],
  },
}))

import PublicBookingCalendar from '../../inertia/components/public_booking/PublicBookingCalendar.vue'

/**
 * Calendrier de la page publique de réservation (#881) : les jours occupés et
 * hors fenêtre ne sont pas cliquables, un départ peut tomber sur un jour occupé.
 */
const BASE = {
  bookableFrom: '2031-07-03',
  bookableUntil: '2032-07-02',
  busy: [{ startsOn: '2031-07-10', endsOn: '2031-07-14' }],
  draft: null,
}

function day(wrapper: ReturnType<typeof mount>, iso: string) {
  return wrapper.find(`[data-day="${iso}"]`)
}

describe('PublicBookingCalendar (#881)', () => {
  test('opens on the month of the first bookable day', () => {
    const wrapper = mount(PublicBookingCalendar, { props: BASE })
    expect(day(wrapper, '2031-07-01').exists()).toBe(true)
    expect(day(wrapper, '2031-08-01').exists()).toBe(false)
  })

  test('busy days and days before the window cannot be picked', () => {
    const wrapper = mount(PublicBookingCalendar, { props: BASE })
    expect(day(wrapper, '2031-07-02').attributes('disabled')).toBeDefined()
    expect(day(wrapper, '2031-07-11').attributes('disabled')).toBeDefined()
    expect(day(wrapper, '2031-07-11').attributes('data-busy')).toBe('true')
    expect(day(wrapper, '2031-07-05').attributes('disabled')).toBeUndefined()
  })

  test('a click emits the picked day', async () => {
    const wrapper = mount(PublicBookingCalendar, { props: BASE })
    await day(wrapper, '2031-07-05').trigger('click')
    expect(wrapper.emitted('pick')).toEqual([['2031-07-05']])
  })

  test('with an arrival set, the first busy day is a valid departure, not the ones after', () => {
    const wrapper = mount(PublicBookingCalendar, {
      props: { ...BASE, draft: { startsOn: '2031-07-06', endsOn: null } },
    })
    expect(day(wrapper, '2031-07-10').attributes('disabled')).toBeUndefined()
    expect(day(wrapper, '2031-07-12').attributes('disabled')).toBeDefined()
    // Au-delà du créneau occupé, un jour libre repose l'arrivée.
    expect(day(wrapper, '2031-07-20').attributes('disabled')).toBeUndefined()
  })

  test('marks the selected range', () => {
    const wrapper = mount(PublicBookingCalendar, {
      props: { ...BASE, draft: { startsOn: '2031-07-04', endsOn: '2031-07-07' } },
    })
    expect(day(wrapper, '2031-07-04').attributes('aria-pressed')).toBe('true')
    expect(day(wrapper, '2031-07-07').attributes('aria-pressed')).toBe('true')
    expect(day(wrapper, '2031-07-05').classes()).toContain('bg-brand-soft')
  })

  test('cannot navigate before the first bookable month', () => {
    const wrapper = mount(PublicBookingCalendar, { props: BASE })
    const [previous, next] = wrapper.findAll('button').filter((b) => !b.attributes('data-day'))
    expect(previous.attributes('disabled')).toBeDefined()
    expect(next.attributes('disabled')).toBeUndefined()
  })
})
