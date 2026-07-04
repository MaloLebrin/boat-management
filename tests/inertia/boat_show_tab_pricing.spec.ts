import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { BoatPricingRow } from '../../shared/types/boat_pricing'

const mockFormPut = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  useForm: (initial: Record<string, unknown>) => ({
    ...initial,
    errors: {},
    processing: false,
    put: mockFormPut,
  }),
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/components/base/BaseCard.vue', () => ({
  default: {
    template: '<div><slot name="header" /><slot /></div>',
    props: ['padded'],
  },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template:
      '<button :type="type" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled'],
  },
}))

vi.mock('~/components/base/BaseInput.vue', () => ({
  default: {
    template: '<input :name="name" :value="modelValue" />',
    props: ['label', 'modelValue', 'errors', 'errorKey', 'name', 'type', 'step', 'min', 'required'],
  },
}))

vi.mock('~/components/base/BaseSelect.vue', () => ({
  default: {
    template: '<select :name="name"><slot /></select>',
    props: ['label', 'modelValue', 'options', 'errors', 'errorKey', 'name'],
  },
}))

import BoatShowTabPricing from '../../inertia/components/boats/show/tabs/BoatShowTabPricing.vue'

const boat = { id: 7, name: 'Aventura' } as never

const pricing: BoatPricingRow = {
  id: 1,
  boatId: 7,
  baseDailyPrice: 120,
  baseWeeklyPrice: 700,
  depositAmount: 1500,
  minDays: 2,
  maxDays: 14,
  currency: 'EUR',
  createdAt: '2026-07-04T00:00:00.000Z',
  updatedAt: '2026-07-04T00:00:00.000Z',
}

describe('BoatShowTabPricing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('canManage: submits form.put to /boats/:id/pricing with preserveScroll', async () => {
    const wrapper = mount(BoatShowTabPricing, {
      props: { boat, pricing: null, canManage: true },
    })
    await wrapper.find('form').trigger('submit')
    expect(mockFormPut).toHaveBeenCalledWith(
      '/boats/7/pricing',
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('read-only: renders no form and shows current pricing', () => {
    const wrapper = mount(BoatShowTabPricing, {
      props: { boat, pricing, canManage: false },
    })
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain('boats.pricing.readOnlyHint')
  })

  test('read-only without pricing shows the empty message', () => {
    const wrapper = mount(BoatShowTabPricing, {
      props: { boat, pricing: null, canManage: false },
    })
    expect(wrapper.text()).toContain('boats.pricing.noPricing')
  })
})
