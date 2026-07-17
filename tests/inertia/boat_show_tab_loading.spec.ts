import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { nextTick } from 'vue'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
  router: { patch: vi.fn(), post: vi.fn() },
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: { template: '<form><slot :processing="false" /></form>' },
  Link: { template: '<a><slot /></a>' },
}))

import BaseTabs from '../../inertia/components/base/BaseTabs.vue'
import BoatShowTabContent from '../../inertia/components/boats/show/BoatShowTabContent.vue'
import BoatShow from '../../inertia/pages/boats/show.vue'

const boat = { id: 13, name: 'Aventura', engines: [], sails: [] } as never

const baseProps = {
  boat,
  maintenanceEvents: [],
  maintenanceTasks: [],
  maintenanceSheets: [],
  boatDocuments: [],
  equipmentActions: [],
  canManageMaintenance: true,
  canManageEquipment: true,
  canManageDocuments: true,
  canManageEquipmentActions: true,
  canDeleteEquipmentActions: true,
  canExport: true,
  aiSuggestions: null,
  pricing: null,
  pricingEnabled: false,
  canManagePricing: false,
} as never

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

describe('boats/show — skeleton loader on tab switch (#361)', () => {
  const originalUrl = window.location.href

  beforeEach(() => {
    window.history.replaceState({}, '', originalUrl)
  })

  afterEach(() => {
    window.history.replaceState({}, '', originalUrl)
  })

  test('shows the skeleton immediately on switch, then swaps to the requested tab', async () => {
    const wrapper = mount(BoatShow, { props: baseProps, shallow: true })
    const content = () => wrapper.findComponent(BoatShowTabContent)

    expect(content().props('isLoading')).toBe(false)
    expect(content().props('tab')).toBe('overview')

    await wrapper.findComponent(BaseTabs).vm.$emit('update:modelValue', 'equipment')
    await nextTick()

    // Le skeleton doit apparaître avant que le contenu (lourd) du nouvel onglet ne soit monté.
    expect(content().props('isLoading')).toBe(true)
    expect(content().props('tab')).toBe('overview')

    await nextFrame()
    await flushPromises()

    expect(content().props('tab')).toBe('equipment')
    expect(content().props('isLoading')).toBe(false)
  })

  test('clicking the already-active tab does not trigger a loading flash', async () => {
    const wrapper = mount(BoatShow, { props: baseProps, shallow: true })
    const content = () => wrapper.findComponent(BoatShowTabContent)

    await wrapper.findComponent(BaseTabs).vm.$emit('update:modelValue', 'overview')
    await flushPromises()

    expect(content().props('isLoading')).toBe(false)
    expect(content().props('tab')).toBe('overview')
  })
})
