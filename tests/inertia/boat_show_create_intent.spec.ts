import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import { nextTick } from 'vue'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
  router: { patch: vi.fn(), post: vi.fn() },
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: { template: '<form><slot :processing="false" /></form>' },
  Link: { template: '<a><slot /></a>' },
}))

// L'onglet Aperçu n'est pas le sujet du test et exige un bateau complet.
vi.mock('~/components/boats/show/tabs/BoatShowTabOverview.vue', () => ({
  default: { template: '<div>overview</div>' },
}))

import BoatMaintenanceTasksPanel from '../../inertia/components/boats/maintenance/BoatMaintenanceTasksPanel.vue'
import BoatShowTabContent from '../../inertia/components/boats/show/BoatShowTabContent.vue'
import BoatShowTabHistory from '../../inertia/components/boats/show/tabs/BoatShowTabHistory.vue'

const boat = { id: 13, name: 'Aventura', engines: [], sails: [] } as never

const tabContentProps = {
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

// `transition: true` évite le délai « out-in » de BoatShowTabContent, qui ne se
// résout jamais en jsdom faute de vraies animations CSS.
const globalStubs = { global: { stubs: { teleport: true, transition: true } } }

describe('BoatShowTabHistory — createIntent', () => {
  test("opens the event modal when mounted with the 'event' intent (#358)", async () => {
    const wrapper = mount(BoatShowTabHistory, {
      props: {
        boat,
        maintenanceEvents: [],
        canManageMaintenance: true,
        createIntent: 'event',
      },
      ...globalStubs,
    })
    await nextTick()

    const modal = wrapper.findComponent({ name: 'BoatMaintenanceEventModal' })
    expect(modal.props('open')).toBe(true)
    expect(wrapper.emitted('createIntentConsumed')).toHaveLength(1)
  })

  test('stays closed without intent', async () => {
    const wrapper = mount(BoatShowTabHistory, {
      props: { boat, maintenanceEvents: [], canManageMaintenance: true, createIntent: null },
      ...globalStubs,
    })
    await nextTick()

    expect(wrapper.findComponent({ name: 'BoatMaintenanceEventModal' }).props('open')).toBe(false)
    expect(wrapper.emitted('createIntentConsumed')).toBeUndefined()
  })

  test("ignores the 'task' intent, which belongs to another tab", async () => {
    const wrapper = mount(BoatShowTabHistory, {
      props: { boat, maintenanceEvents: [], canManageMaintenance: true, createIntent: 'task' },
      ...globalStubs,
    })
    await nextTick()

    expect(wrapper.findComponent({ name: 'BoatMaintenanceEventModal' }).props('open')).toBe(false)
    expect(wrapper.emitted('createIntentConsumed')).toBeUndefined()
  })

  test('consumes the intent without opening when the user cannot manage maintenance', async () => {
    const wrapper = mount(BoatShowTabHistory, {
      props: { boat, maintenanceEvents: [], canManageMaintenance: false, createIntent: 'event' },
      ...globalStubs,
    })
    await nextTick()

    expect(wrapper.findComponent({ name: 'BoatMaintenanceEventModal' }).props('open')).toBe(false)
    expect(wrapper.emitted('createIntentConsumed')).toHaveLength(1)
  })

  test('opens the modal when the intent arrives while the tab is already mounted', async () => {
    const wrapper = mount(BoatShowTabHistory, {
      props: { boat, maintenanceEvents: [], canManageMaintenance: true, createIntent: null },
      ...globalStubs,
    })
    await wrapper.setProps({ createIntent: 'event' })
    await nextTick()

    expect(wrapper.findComponent({ name: 'BoatMaintenanceEventModal' }).props('open')).toBe(true)
    expect(wrapper.emitted('createIntentConsumed')).toHaveLength(1)
  })
})

describe('BoatMaintenanceTasksPanel — createIntent', () => {
  test("opens the create modal when mounted with the 'task' intent (#358)", async () => {
    const wrapper = mount(BoatMaintenanceTasksPanel, {
      props: { boat, tasks: [], canManageMaintenance: true, createIntent: 'task' },
      ...globalStubs,
    })
    await nextTick()

    expect(wrapper.findComponent({ name: 'BaseModal' }).props('open')).toBe(true)
    expect(wrapper.emitted('createIntentConsumed')).toHaveLength(1)
  })

  test("ignores the 'event' intent, which belongs to another tab", async () => {
    const wrapper = mount(BoatMaintenanceTasksPanel, {
      props: { boat, tasks: [], canManageMaintenance: true, createIntent: 'event' },
      ...globalStubs,
    })
    await nextTick()

    expect(wrapper.findComponent({ name: 'BaseModal' }).props('open')).toBe(false)
    expect(wrapper.emitted('createIntentConsumed')).toBeUndefined()
  })
})

describe('BoatShowTabContent — deferred tab mount (#358)', () => {
  test('opens the event modal when History is mounted after the intent is set', async () => {
    const wrapper = mount(BoatShowTabContent, {
      props: { ...(tabContentProps as object), tab: 'overview', createIntent: null } as never,
      ...globalStubs,
    })

    // Ce que fait l'en-tête au clic sur « + Ajouter une entrée » : changer
    // d'onglet et poser l'intention dans le même tick.
    await wrapper.setProps({ tab: 'history', createIntent: 'event' })
    await nextTick()

    const history = wrapper.findComponent(BoatShowTabHistory)
    expect(history.exists()).toBe(true)
    expect(history.findComponent({ name: 'BoatMaintenanceEventModal' }).props('open')).toBe(true)
    expect(wrapper.emitted('createIntentConsumed')).toHaveLength(1)
  })

  test('opens the task modal when Tasks is mounted after the intent is set', async () => {
    const wrapper = mount(BoatShowTabContent, {
      props: { ...(tabContentProps as object), tab: 'overview', createIntent: null } as never,
      ...globalStubs,
    })

    await wrapper.setProps({ tab: 'tasks', createIntent: 'task' })
    await nextTick()

    const panel = wrapper.findComponent(BoatMaintenanceTasksPanel)
    expect(panel.exists()).toBe(true)
    expect(panel.findComponent({ name: 'BaseModal' }).props('open')).toBe(true)
    expect(wrapper.emitted('createIntentConsumed')).toHaveLength(1)
  })
})
