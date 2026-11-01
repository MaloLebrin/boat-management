import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const { post, put } = vi.hoisted(() => ({
  post: vi.fn(),
  put: vi.fn(),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: {
    name: 'Form',
    template: '<form @submit.prevent><slot :processing="false" /></form>',
    props: ['action'],
  },
}))

vi.mock('@inertiajs/vue3', () => ({
  useForm: <T extends Record<string, unknown>>(initial: T) => {
    let transformFn: ((data: T) => unknown) | null = null
    const form = {
      ...initial,
      errors: {} as Record<string, string | undefined>,
      processing: false,
      transform(fn: (data: T) => unknown) {
        transformFn = fn
        return form
      },
      post: (url: string, options: { preserveScroll?: boolean; onSuccess?: () => void }) => {
        post(url, transformFn ? transformFn(form as T) : form, options)
        options.onSuccess?.()
      },
      put: (url: string, options: { preserveScroll?: boolean; onSuccess?: () => void }) => {
        put(url, transformFn ? transformFn(form as T) : form, options)
        options.onSuccess?.()
      },
    }
    return form
  },
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}${JSON.stringify(vars)}` : key,
  }),
}))

// Mock BaseModal to always render its content
vi.mock('~/components/base/BaseModal.vue', () => ({
  default: {
    name: 'BaseModal',
    props: ['open', 'title', 'closeLabel'],
    template: '<div v-if="open"><slot /></div>',
    emits: ['update:open'],
  },
}))

import BoatShowBatteriesSection from '../../inertia/components/boats/show/tabs/equipment/BoatShowBatteriesSection.vue'
import BoatShowTanksSection from '../../inertia/components/boats/show/tabs/equipment/BoatShowTanksSection.vue'
import type { BoatBatteryRow, BoatTankRow } from '../../shared/types/boat'

beforeEach(() => {
  post.mockClear()
  put.mockClear()
})

describe('BoatShowBatteriesSection (#1037)', () => {
  const batteries: BoatBatteryRow[] = [
    {
      id: 1,
      name: 'Servitude',
      chemistry: 'lithium',
      capacityAh: 200,
      nominalVoltage: 12,
      lowVoltageV: 11.5,
      position: 0,
      instrumentKey: 'house',
    },
  ]

  test('renders battery list with details', () => {
    const wrapper = mount(BoatShowBatteriesSection, {
      props: { boatId: 7, batteries, canManage: true },
    })
    expect(wrapper.find('[data-testid="batteries-section"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="battery-row"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Servitude')
    expect(wrapper.text()).toContain('boats.batteries.chemistry.lithium')
    expect(wrapper.text()).toContain('200 Ah')
  })

  test('empty state when no batteries', () => {
    const wrapper = mount(BoatShowBatteriesSection, {
      props: { boatId: 7, batteries: [], canManage: true },
    })
    expect(wrapper.find('[data-testid="batteries-empty"]').exists()).toBe(true)
  })

  test('add button hidden when canManage is false', () => {
    const wrapper = mount(BoatShowBatteriesSection, {
      props: { boatId: 7, batteries: [], canManage: false },
    })
    expect(wrapper.find('[data-testid="batteries-add"]').exists()).toBe(false)
  })

  test('create battery form submission', async () => {
    const wrapper = mount(BoatShowBatteriesSection, {
      props: { boatId: 7, batteries: [], canManage: true },
    })
    await wrapper.find('[data-testid="batteries-add"]').trigger('click')
    await flushPromises()

    const form = wrapper.find('[data-testid="battery-create-form"]')
    expect(form.exists()).toBe(true)

    await wrapper.find('input[name="name"]').setValue('Demarrage')
    await form.trigger('submit')
    await flushPromises()

    expect(post).toHaveBeenCalledWith(
      '/boats/7/batteries',
      expect.objectContaining({ name: 'Demarrage' }),
      expect.anything()
    )
  })
})

describe('BoatShowTanksSection (#1037)', () => {
  const tanks: BoatTankRow[] = [
    {
      id: 1,
      name: 'Gasoil principal',
      type: 'fuel',
      capacityL: 150,
      lowLevelPct: 20,
      instrumentKey: 'fuel.0',
    },
  ]

  test('renders tank list with details', () => {
    const wrapper = mount(BoatShowTanksSection, {
      props: { boatId: 7, tanks, canManage: true },
    })
    expect(wrapper.find('[data-testid="tanks-section"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="tank-row"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Gasoil principal')
    expect(wrapper.text()).toContain('boats.tanks.type.fuel')
    expect(wrapper.text()).toContain('150 L')
  })

  test('empty state when no tanks', () => {
    const wrapper = mount(BoatShowTanksSection, {
      props: { boatId: 7, tanks: [], canManage: true },
    })
    expect(wrapper.find('[data-testid="tanks-empty"]').exists()).toBe(true)
  })

  test('add button hidden when canManage is false', () => {
    const wrapper = mount(BoatShowTanksSection, {
      props: { boatId: 7, tanks: [], canManage: false },
    })
    expect(wrapper.find('[data-testid="tanks-add"]').exists()).toBe(false)
  })

  test('create tank form submission', async () => {
    const wrapper = mount(BoatShowTanksSection, {
      props: { boatId: 7, tanks: [], canManage: true },
    })
    await wrapper.find('[data-testid="tanks-add"]').trigger('click')
    await flushPromises()

    const form = wrapper.find('[data-testid="tank-create-form"]')
    expect(form.exists()).toBe(true)

    await wrapper.find('input[name="name"]').setValue('Eau douce')
    await form.trigger('submit')
    await flushPromises()

    expect(post).toHaveBeenCalledWith(
      '/boats/7/tanks',
      expect.objectContaining({ name: 'Eau douce', type: 'fuel' }),
      expect.anything()
    )
  })
})
