import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  Head: { template: '<div><slot /></div>' },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
  router: { patch: vi.fn(), post: vi.fn() },
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: { template: '<form><slot :processing="false" /></form>' },
  Link: { template: '<a><slot /></a>' },
}))

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
  incidents: [],
  fuelLogs: [],
  navigationLogs: [],
  portOptions: [],
  crewMemberOptions: [],
  positionHistory: [],
  latestGpsPosition: null,
  canDeleteIncidents: true,
  canCreateFuelLogs: true,
  canDeleteFuelLogs: true,
  canCreateNavigationLogs: true,
  canUpdateNavigationLogs: true,
  canDeleteNavigationLogs: true,
} as never

describe('boats/show — deep-link ?tab= (#359)', () => {
  const originalUrl = window.location.href

  beforeEach(() => {
    window.history.replaceState({}, '', originalUrl)
  })

  afterEach(() => {
    window.history.replaceState({}, '', originalUrl)
  })

  test('opens directly on the tab requested in the URL, without waiting for onMounted', () => {
    window.history.replaceState({}, '', '/boats/13?tab=tasks')

    const wrapper = mount(BoatShow, { props: baseProps, shallow: true })

    expect(wrapper.findComponent(BoatShowTabContent).props('tab')).toBe('tasks')
  })

  test('falls back to overview when the URL has no tab param', () => {
    window.history.replaceState({}, '', '/boats/13')

    const wrapper = mount(BoatShow, { props: baseProps, shallow: true })

    expect(wrapper.findComponent(BoatShowTabContent).props('tab')).toBe('overview')
  })

  test('ignores an unknown tab value in the URL', () => {
    window.history.replaceState({}, '', '/boats/13?tab=not-a-real-tab')

    const wrapper = mount(BoatShow, { props: baseProps, shallow: true })

    expect(wrapper.findComponent(BoatShowTabContent).props('tab')).toBe('overview')
  })
})
