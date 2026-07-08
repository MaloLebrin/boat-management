import { mount, config } from '@vue/test-utils'
import { test, expect, vi, beforeAll, afterAll } from 'vitest'
import BoatShowTabEquipmentActions from '../../inertia/components/boats/show/tabs/BoatShowTabEquipmentActions.vue'
import type { BoatEquipmentActionRow } from '../../shared/types/equipment_action'
import type { BoatShowDetail } from '../../inertia/types/boat_show'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@inertiajs/vue3', () => ({
  router: { delete: vi.fn() },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: { template: '<button @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
}))

vi.mock('~/components/base/BaseSegmentedControl.vue', () => ({
  default: {
    template:
      '<div class="segmented-control"><button v-for="opt in options" :key="opt.value" @click="$emit(\'update:modelValue\', opt.value)">{{ opt.label }}</button></div>',
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
  },
}))

vi.mock('~/components/boats/equipment-actions/BoatEquipmentActionCard.vue', () => ({
  default: {
    template: '<div class="action-card" :data-id="action.id">{{ action.label }}</div>',
    props: ['action', 'canManage', 'canDelete'],
    emits: ['edit', 'delete'],
  },
}))

vi.mock('~/components/boats/equipment-actions/BoatEquipmentActionModal.vue', () => ({
  default: {
    template: '<div v-if="open" class="modal">Modal</div>',
    props: ['boat', 'open', 'editingAction'],
    emits: ['update:open'],
  },
}))

const minimalBoat: BoatShowDetail = {
  id: 10,
  name: 'Test Boat',
  registrationNumber: null,
  type: null,
  propulsionType: null,
  lengthM: null,
  beamM: null,
  draftM: null,
  mastHeightM: null,
  hullMaterial: null,
  yearBuilt: null,
  manufacturer: null,
  model: null,
  homePort: null,
  navigationCategory: null,
  hullIdentificationNumber: null,
  francisationNumber: null,
  flagCountry: null,
  maxPersons: null,
  mmsi: null,
  imoNumber: null,
  spotId: null,
  spot: null,
  positionHistory: [],
  engines: [],
  sails: [],
  rig: null,
  media: [],
  safetyEquipment: [],
  genericEquipment: [],
}

const sampleActions: BoatEquipmentActionRow[] = [
  {
    id: 1,
    boatId: 10,
    actionType: 'to_buy',
    status: 'pending',
    label: 'Buy anchor',
    notes: null,
    estimatedCost: 100,
    actualCost: null,
    equipmentType: null,
    equipmentId: null,
    resolvedAt: null,
    createdAt: '2024-01-15T10:00:00.000Z',
    createdBy: 1,
  },
  {
    id: 2,
    boatId: 10,
    actionType: 'to_replace',
    status: 'ordered',
    label: 'Replace fender',
    notes: null,
    estimatedCost: 50,
    actualCost: null,
    equipmentType: null,
    equipmentId: null,
    resolvedAt: null,
    createdAt: '2024-01-16T10:00:00.000Z',
    createdBy: 1,
  },
  {
    id: 3,
    boatId: 10,
    actionType: 'to_repair',
    status: 'done',
    label: 'Repair winch',
    notes: null,
    estimatedCost: 200,
    actualCost: 180,
    equipmentType: null,
    equipmentId: null,
    resolvedAt: '2024-01-20T10:00:00.000Z',
    createdAt: '2024-01-17T10:00:00.000Z',
    createdBy: 1,
  },
]

let originalTeleport: (typeof config.global.stubs)['teleport']

beforeAll(() => {
  originalTeleport = config.global.stubs.teleport
  config.global.stubs.teleport = true
})

afterAll(() => {
  config.global.stubs.teleport = originalTeleport
})

function mountTab(
  equipmentActions: BoatEquipmentActionRow[] = sampleActions,
  canManage = true,
  canDelete = true
) {
  return mount(BoatShowTabEquipmentActions, {
    props: {
      boat: minimalBoat,
      equipmentActions,
      canManage,
      canDelete,
    },
  })
}

test('renders action count', () => {
  const w = mountTab()
  expect(w.text()).toContain('equipmentActions.count')
})

test('renders all actions by default', () => {
  const w = mountTab()
  const cards = w.findAll('.action-card')
  expect(cards.length).toBe(3)
})

test('shows empty state when no actions', () => {
  const w = mountTab([])
  expect(w.text()).toContain('equipmentActions.empty')
})

test('shows add button in empty state when canManage is true', () => {
  const w = mountTab([], true)
  expect(w.text()).toContain('equipmentActions.addAction')
})

test('does not show add button when canManage is false', () => {
  const w = mountTab([], false)
  // Count occurrences of addAction - should be 0
  const buttons = w.findAll('button')
  const addButtons = buttons.filter((b) => b.text().includes('equipmentActions.addAction'))
  expect(addButtons.length).toBe(0)
})

test('filters by status when status filter is changed', async () => {
  const w = mountTab()

  // Initially all 3 actions visible
  expect(w.findAll('.action-card').length).toBe(3)

  // Click on 'pending' status filter
  const segmentedControls = w.findAll('.segmented-control')
  const statusControl = segmentedControls[0]
  const pendingButton = statusControl.findAll('button').find((b) => b.text().includes('pending'))
  await pendingButton?.trigger('click')

  // Now only 1 action should be visible (the pending one)
  expect(w.findAll('.action-card').length).toBe(1)
  expect(w.text()).toContain('Buy anchor')
})

test('filters by action type when type filter is changed', async () => {
  const w = mountTab()

  // Initially all 3 actions visible
  expect(w.findAll('.action-card').length).toBe(3)

  // Click on 'to_repair' type filter
  const segmentedControls = w.findAll('.segmented-control')
  const typeControl = segmentedControls[1]
  const repairButton = typeControl.findAll('button').find((b) => b.text().includes('to_repair'))
  await repairButton?.trigger('click')

  // Now only 1 action should be visible (the repair one)
  expect(w.findAll('.action-card').length).toBe(1)
  expect(w.text()).toContain('Repair winch')
})

test('combines status and type filters', async () => {
  const w = mountTab()

  // Click on 'pending' status
  const segmentedControls = w.findAll('.segmented-control')
  const statusControl = segmentedControls[0]
  const pendingButton = statusControl.findAll('button').find((b) => b.text().includes('pending'))
  await pendingButton?.trigger('click')

  // Click on 'to_replace' type - should result in 0 matches since pending action is to_buy
  const typeControl = segmentedControls[1]
  const replaceButton = typeControl.findAll('button').find((b) => b.text().includes('to_replace'))
  await replaceButton?.trigger('click')

  expect(w.findAll('.action-card').length).toBe(0)
})

test('opens modal when add button is clicked', async () => {
  const w = mountTab()

  // Modal should not be visible initially
  expect(w.find('.modal').exists()).toBe(false)

  // Click the add button
  const addButton = w.findAll('button').find((b) => b.text().includes('equipmentActions.addAction'))
  await addButton?.trigger('click')

  // Modal should now be visible
  expect(w.find('.modal').exists()).toBe(true)
})

test('renders status filter controls', () => {
  const w = mountTab()
  expect(w.text()).toContain('equipmentActions.filters.allStatuses')
})

test('renders type filter controls', () => {
  const w = mountTab()
  expect(w.text()).toContain('equipmentActions.filters.allTypes')
})
