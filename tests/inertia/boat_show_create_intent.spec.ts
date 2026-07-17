import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import { nextTick } from 'vue'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
  router: { patch: vi.fn(), post: vi.fn(), delete: vi.fn() },
  useForm: () => ({
    departedAt: '2026-06-25T10:00',
    departurePortId: '',
    departurePortName: '',
    engineHoursStart: '',
    windForceBeaufort: '',
    seaState: '',
    crewCount: '',
    notes: '',
    errors: {},
    processing: false,
    post: vi.fn(),
    data: vi.fn(() => ({})),
  }),
}))

vi.mock('~/composables/use_network_status', () => ({
  useNetworkStatus: () => ({ isOnline: { value: true } }),
}))

vi.mock('~/composables/use_offline_queue', () => ({
  useOfflineQueue: () => ({ enqueue: vi.fn() }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: { template: '<form><slot :processing="false" /></form>' },
  Link: { template: '<a><slot /></a>' },
}))

// L'onglet Aperçu n'est pas le sujet du test et exige un bateau complet.
vi.mock('~/components/boats/show/tabs/BoatShowTabOverview.vue', () => ({
  default: { template: '<div>overview</div>' },
}))

// Le contenu détaillé de ces cartes n'est pas le sujet du test — seul le
// déclenchement de la modale d'ajout via createIntent nous intéresse (#365).
vi.mock('~/components/boats/engine/BoatShowEnginesCard.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('~/components/boats/sail/BoatShowSailsCard.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('~/components/boats/rig/BoatShowRigCard.vue', () => ({ default: { template: '<div />' } }))
vi.mock('~/components/boats/safety/BoatSafetyEquipmentCard.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('~/components/boats/equipment/BoatGenericEquipmentCard.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('~/components/boats/equipment-actions/BoatEquipmentActionModal.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('~/components/boats/show/modals/BoatEquipmentAddModal.vue', () => ({
  default: {
    name: 'BoatEquipmentAddModal',
    props: ['boat', 'canManageEquipment', 'open'],
    template: '<div />',
  },
}))

import BoatMaintenanceTasksPanel from '../../inertia/components/boats/maintenance/BoatMaintenanceTasksPanel.vue'
import BoatShowTabContent from '../../inertia/components/boats/show/BoatShowTabContent.vue'
import BoatShowTabEquipment from '../../inertia/components/boats/show/tabs/BoatShowTabEquipment.vue'
import BoatShowTabHistory from '../../inertia/components/boats/show/tabs/BoatShowTabHistory.vue'
import BoatShowTabNavigationLogs from '../../inertia/components/boats/show/tabs/BoatShowTabNavigationLogs.vue'

const boat = {
  id: 13,
  name: 'Aventura',
  engines: [],
  sails: [],
  rig: null,
  safetyEquipment: [],
  genericEquipment: [],
} as never

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
        canExport: true,
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
      props: {
        boat,
        maintenanceEvents: [],
        canManageMaintenance: true,
        canExport: true,
        createIntent: null,
      },
      ...globalStubs,
    })
    await nextTick()

    expect(wrapper.findComponent({ name: 'BoatMaintenanceEventModal' }).props('open')).toBe(false)
    expect(wrapper.emitted('createIntentConsumed')).toBeUndefined()
  })

  test("ignores the 'task' intent, which belongs to another tab", async () => {
    const wrapper = mount(BoatShowTabHistory, {
      props: {
        boat,
        maintenanceEvents: [],
        canManageMaintenance: true,
        canExport: true,
        createIntent: 'task',
      },
      ...globalStubs,
    })
    await nextTick()

    expect(wrapper.findComponent({ name: 'BoatMaintenanceEventModal' }).props('open')).toBe(false)
    expect(wrapper.emitted('createIntentConsumed')).toBeUndefined()
  })

  test('consumes the intent without opening when the user cannot manage maintenance', async () => {
    const wrapper = mount(BoatShowTabHistory, {
      props: {
        boat,
        maintenanceEvents: [],
        canManageMaintenance: false,
        canExport: true,
        createIntent: 'event',
      },
      ...globalStubs,
    })
    await nextTick()

    expect(wrapper.findComponent({ name: 'BoatMaintenanceEventModal' }).props('open')).toBe(false)
    expect(wrapper.emitted('createIntentConsumed')).toHaveLength(1)
  })

  test('opens the modal when the intent arrives while the tab is already mounted', async () => {
    const wrapper = mount(BoatShowTabHistory, {
      props: {
        boat,
        maintenanceEvents: [],
        canManageMaintenance: true,
        canExport: true,
        createIntent: null,
      },
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

describe('BoatShowTabEquipment — createIntent (#365)', () => {
  test("opens the add-equipment modal when mounted with the 'equipment' intent", async () => {
    const wrapper = mount(BoatShowTabEquipment, {
      props: {
        boat,
        canManageEquipment: true,
        canManageActions: true,
        createIntent: 'equipment',
      },
      ...globalStubs,
    })
    await nextTick()

    expect(wrapper.findComponent({ name: 'BoatEquipmentAddModal' }).props('open')).toBe(true)
    expect(wrapper.emitted('createIntentConsumed')).toHaveLength(1)
  })

  test('consumes the intent without opening when the user cannot manage equipment', async () => {
    const wrapper = mount(BoatShowTabEquipment, {
      props: {
        boat,
        canManageEquipment: false,
        canManageActions: true,
        createIntent: 'equipment',
      },
      ...globalStubs,
    })
    await nextTick()

    expect(wrapper.findComponent({ name: 'BoatEquipmentAddModal' }).props('open')).toBe(false)
    expect(wrapper.emitted('createIntentConsumed')).toHaveLength(1)
  })

  test("ignores the 'task' intent, which belongs to another tab", async () => {
    const wrapper = mount(BoatShowTabEquipment, {
      props: {
        boat,
        canManageEquipment: true,
        canManageActions: true,
        createIntent: 'task',
      },
      ...globalStubs,
    })
    await nextTick()

    expect(wrapper.findComponent({ name: 'BoatEquipmentAddModal' }).props('open')).toBe(false)
    expect(wrapper.emitted('createIntentConsumed')).toBeUndefined()
  })
})

describe('BoatShowTabNavigationLogs — createIntent (#365)', () => {
  test("opens the create form when mounted with the 'navigationLog' intent", async () => {
    const wrapper = mount(BoatShowTabNavigationLogs, {
      props: {
        boat,
        navigationLogs: [],
        portOptions: [],
        crewMemberOptions: [],
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        createIntent: 'navigationLog',
      },
      ...globalStubs,
    })
    await nextTick()

    expect(wrapper.findComponent({ name: 'NavigationLogForm' }).exists()).toBe(true)
    expect(wrapper.emitted('createIntentConsumed')).toHaveLength(1)
  })

  test('does not open the form when a trip is already in progress', async () => {
    const wrapper = mount(BoatShowTabNavigationLogs, {
      props: {
        boat,
        navigationLogs: [
          {
            id: 1,
            boatId: 13,
            status: 'in_progress',
            departedAt: '2026-06-25T10:00:00.000Z',
            arrivedAt: null,
            departurePortId: null,
            departurePortName: null,
            arrivalPortId: null,
            arrivalPortName: null,
            distanceNm: null,
            engineHoursStart: null,
            engineHoursEnd: null,
            fuelConsumedLiters: null,
            windForceBeaufort: null,
            seaState: null,
            crewCount: null,
            notes: null,
            createdAt: '2026-06-25T10:00:00.000Z',
            updatedAt: '2026-06-25T10:00:00.000Z',
            crew: [],
          },
        ] as never,
        portOptions: [],
        crewMemberOptions: [],
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        createIntent: 'navigationLog',
      },
      ...globalStubs,
    })
    await nextTick()

    expect(wrapper.findComponent({ name: 'NavigationLogForm' }).exists()).toBe(false)
    expect(wrapper.emitted('createIntentConsumed')).toHaveLength(1)
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
