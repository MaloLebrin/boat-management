import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import type { BoatPricingRow } from '../../shared/types/boat_pricing'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/components/base/BaseCard.vue', () => ({
  default: { template: '<div><slot name="header" /><slot /></div>' },
}))
vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button @click="$emit(\'click\')"><slot /></button>',
    props: ['size', 'variant'],
  },
}))
vi.mock('~/components/base/BaseAlert.vue', () => ({
  default: { template: '<div class="alert"><slot /></div>', props: ['variant'] },
}))

import ReservationQuoteCard from '../../inertia/components/reservations/ReservationQuoteCard.vue'

function pricing(overrides: Partial<BoatPricingRow> = {}): BoatPricingRow {
  return {
    id: 1,
    boatId: 1,
    baseDailyPrice: 100,
    baseWeeklyPrice: null,
    depositAmount: null,
    minDays: null,
    maxDays: null,
    currency: 'EUR',
    createdAt: null,
    updatedAt: null,
    ...overrides,
  }
}

describe('ReservationQuoteCard', () => {
  test('shows the no-pricing hint when the boat has no pricing', () => {
    const wrapper = mount(ReservationQuoteCard, {
      props: { pricing: null, seasons: [], startsAt: '2026-07-01', endsAt: '2026-07-04' },
    })
    expect(wrapper.text()).toContain('reservations.quote.noPricing')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  test('clicking apply emits the computed total', async () => {
    const wrapper = mount(ReservationQuoteCard, {
      props: { pricing: pricing(), seasons: [], startsAt: '2026-07-01', endsAt: '2026-07-04' },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('apply')).toBeTruthy()
    expect(wrapper.emitted('apply')![0]).toEqual([300])
  })

  test('shows a bounds warning when below the minimum stay', () => {
    const wrapper = mount(ReservationQuoteCard, {
      props: {
        pricing: pricing({ minDays: 5 }),
        seasons: [],
        startsAt: '2026-07-01',
        endsAt: '2026-07-04',
      },
    })
    expect(wrapper.find('.alert').exists()).toBe(true)
    expect(wrapper.text()).toContain('reservations.quote.belowMin')
  })
})
