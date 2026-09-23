import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { PricingSeasonRow } from '../../shared/types/pricing_season'

const mockPost = vi.hoisted(() => vi.fn())
const mockPut = vi.hoisted(() => vi.fn())
const mockReset = vi.hoisted(() => vi.fn())
const mockTransform = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  useForm: (initial: Record<string, unknown>) => ({
    ...initial,
    errors: {},
    processing: false,
    data: () => ({ ...initial }),
    reset: mockReset,
    transform: (fn: () => unknown) => {
      mockTransform(fn())
      return { post: mockPost, put: mockPut }
    },
  }),
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :type="type" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled'],
  },
}))

vi.mock('~/components/base/BaseInput.vue', () => ({
  default: {
    template: '<input :name="name" :value="modelValue" />',
    props: ['label', 'modelValue', 'errors', 'errorKey', 'name', 'type', 'required', 'hint'],
  },
}))

vi.mock('~/components/base/BaseSelect.vue', () => ({
  default: {
    template: '<select :name="name"></select>',
    props: ['label', 'modelValue', 'options', 'errors', 'errorKey', 'name'],
  },
}))

vi.mock('~/components/base/BaseSegmentedControl.vue', () => ({
  default: {
    template: '<div class="segmented"></div>',
    props: ['modelValue', 'options'],
  },
}))

import PricingSeasonForm from '../../inertia/components/pricing/PricingSeasonForm.vue'

const season: PricingSeasonRow = {
  id: 42,
  boatId: null,
  boatName: null,
  name: 'Haute saison',
  startsOn: '2026-07-01',
  endsOn: '2026-08-31',
  dailyPrice: null,
  multiplier: 1.5,
  priority: 10,
  createdAt: null,
  updatedAt: null,
}

describe('PricingSeasonForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('create mode: submits transform().post to /pricing/seasons', async () => {
    const wrapper = mount(PricingSeasonForm, { props: { boatOptions: [] } })
    await wrapper.find('form').trigger('submit')
    expect(mockPost).toHaveBeenCalledWith(
      '/pricing/seasons',
      expect.objectContaining({ preserveScroll: true })
    )
    expect(mockPut).not.toHaveBeenCalled()
  })

  test('edit mode: submits transform().put to /pricing/seasons/:id', async () => {
    const wrapper = mount(PricingSeasonForm, { props: { season, boatOptions: [] } })
    await wrapper.find('form').trigger('submit')
    expect(mockPut).toHaveBeenCalledWith(
      '/pricing/seasons/42',
      expect.objectContaining({ preserveScroll: true })
    )
    expect(mockPost).not.toHaveBeenCalled()
  })

  test('cancel button emits close', async () => {
    const wrapper = mount(PricingSeasonForm, { props: { boatOptions: [] } })
    const cancel = wrapper.findAll('button').find((b) => b.attributes('type') === 'button')
    expect(cancel).toBeDefined()
    await cancel!.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  test('displays edit title when a season is provided', () => {
    const wrapper = mount(PricingSeasonForm, { props: { season, boatOptions: [] } })
    expect(wrapper.text()).toContain('pricingSeasons.form.editTitle')
  })

  describe('single boat fleet (#823)', () => {
    const fleet = [
      { id: 7, name: 'Mistral' },
      { id: 8, name: 'Zephyr' },
    ]

    test('hides the scope selector and creates the season on the only boat', async () => {
      const wrapper = mount(PricingSeasonForm, { props: { boatOptions: [fleet[0]] } })
      expect(wrapper.find('select[name="boatId"]').exists()).toBe(false)

      await wrapper.find('form').trigger('submit')
      expect(mockTransform).toHaveBeenCalledWith(expect.objectContaining({ boatId: 7 }))
    })

    test('keeps the scope of an existing global season untouched', async () => {
      const wrapper = mount(PricingSeasonForm, { props: { season, boatOptions: [fleet[0]] } })
      expect(wrapper.find('select[name="boatId"]').exists()).toBe(false)

      await wrapper.find('form').trigger('submit')
      expect(mockTransform).toHaveBeenCalledWith(expect.objectContaining({ boatId: null }))
    })

    test('still offers the scope selector with several boats, global by default', async () => {
      const wrapper = mount(PricingSeasonForm, { props: { boatOptions: fleet } })
      expect(wrapper.find('select[name="boatId"]').exists()).toBe(true)

      await wrapper.find('form').trigger('submit')
      expect(mockTransform).toHaveBeenCalledWith(expect.objectContaining({ boatId: null }))
    })
  })
})
