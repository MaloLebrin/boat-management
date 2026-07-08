import { mount, config } from '@vue/test-utils'
import { test, expect, vi, beforeAll, afterAll } from 'vitest'
import BoatEquipmentActionModal from '../../inertia/components/boats/equipment-actions/BoatEquipmentActionModal.vue'
import type { BoatEquipmentActionRow } from '../../shared/types/equipment_action'
import type { BoatShowDetail } from '../../inertia/types/boat_show'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: {
    template: '<form @submit.prevent><slot :processing="false" :errors="{}" /></form>',
  },
}))

vi.mock('~/components/base/BaseModal.vue', () => ({
  default: {
    template: '<div v-if="open"><span class="modal-title">{{ title }}</span><slot /></div>',
    props: ['open', 'title', 'subtitle', 'size'],
    emits: ['update:open'],
  },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: { template: '<button @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
}))

vi.mock('~/components/base/BaseInput.vue', () => ({
  default: {
    template: '<input :value="modelValue" :name="name" />',
    props: ['modelValue', 'label', 'errors', 'name', 'type', 'step', 'min', 'id', 'required'],
    emits: ['update:modelValue'],
  },
}))

vi.mock('~/components/base/BaseSelect.vue', () => ({
  default: {
    template:
      '<select :value="modelValue" :name="name"><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'label', 'errors', 'name', 'options', 'id', 'required'],
    emits: ['update:modelValue'],
  },
}))

vi.mock('~/components/base/BaseTextarea.vue', () => ({
  default: {
    template: '<textarea :value="modelValue" :name="name" />',
    props: ['modelValue', 'label', 'errors', 'name', 'rows', 'id'],
    emits: ['update:modelValue'],
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

const sampleAction: BoatEquipmentActionRow = {
  id: 1,
  boatId: 10,
  actionType: 'to_replace',
  status: 'ordered',
  label: 'Replace fender',
  notes: 'Port side',
  estimatedCost: 100,
  actualCost: 95,
  equipmentType: 'generic',
  equipmentId: 5,
  resolvedAt: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  createdBy: 1,
}

let originalTeleport: (typeof config.global.stubs)['teleport']

beforeAll(() => {
  originalTeleport = config.global.stubs.teleport
  config.global.stubs.teleport = true
})

afterAll(() => {
  config.global.stubs.teleport = originalTeleport
})

function mountModal(editingAction: BoatEquipmentActionRow | null = null, open = true) {
  return mount(BoatEquipmentActionModal, {
    props: {
      boat: minimalBoat,
      open,
      editingAction,
    },
  })
}

test('renders modal with create title when editingAction is null', () => {
  const w = mountModal(null)
  expect(w.text()).toContain('equipmentActions.form.createTitle')
})

test('renders modal with edit title when editingAction is provided', () => {
  const w = mountModal(sampleAction)
  expect(w.text()).toContain('equipmentActions.form.editTitle')
})

test('has required fields: label and actionType', () => {
  const w = mountModal(null)
  const inputs = w.findAll('input')
  const selects = w.findAll('select')

  // Label input
  const labelInput = inputs.find((i) => i.attributes('name') === 'label')
  expect(labelInput).toBeTruthy()

  // ActionType select
  const actionTypeSelect = selects.find((s) => s.attributes('name') === 'actionType')
  expect(actionTypeSelect).toBeTruthy()
})

test('shows status and actualCost fields only in edit mode', () => {
  const createModal = mountModal(null)
  const createInputs = createModal.findAll('input')
  const createSelects = createModal.findAll('select')

  // In create mode, no actualCost or status
  expect(createInputs.find((i) => i.attributes('name') === 'actualCost')).toBeFalsy()
  expect(createSelects.find((s) => s.attributes('name') === 'status')).toBeFalsy()

  const editModal = mountModal(sampleAction)
  const editInputs = editModal.findAll('input')
  const editSelects = editModal.findAll('select')

  // In edit mode, actualCost and status are present
  expect(editInputs.find((i) => i.attributes('name') === 'actualCost')).toBeTruthy()
  expect(editSelects.find((s) => s.attributes('name') === 'status')).toBeTruthy()
})

test('does not render when open is false', () => {
  const w = mountModal(null, false)
  // The BaseModal mock only renders slot when open=true
  expect(w.text()).not.toContain('equipmentActions.fields.label')
})

test('has submit and cancel buttons', () => {
  const w = mountModal(null)
  expect(w.text()).toContain('equipmentActions.form.submit')
  expect(w.text()).toContain('equipmentActions.form.cancel')
})

test('pre-fills a new action from the prefill prop and submits the equipment link (#313)', () => {
  const w = mount(BoatEquipmentActionModal, {
    props: {
      boat: minimalBoat,
      open: true,
      editingAction: null,
      prefill: {
        label: 'Winch tribord',
        actionType: 'to_replace' as const,
        equipmentType: 'generic' as const,
        equipmentId: 7,
      },
    },
  })
  const inputs = w.findAll('input')
  expect(inputs.find((i) => i.attributes('name') === 'label')?.attributes('value')).toBe(
    'Winch tribord'
  )
  expect(inputs.find((i) => i.attributes('name') === 'equipmentType')?.attributes('value')).toBe(
    'generic'
  )
  expect(inputs.find((i) => i.attributes('name') === 'equipmentId')?.attributes('value')).toBe('7')
})

test('does not render equipment hidden inputs without a prefill', () => {
  const inputs = mountModal(null).findAll('input')
  expect(inputs.find((i) => i.attributes('name') === 'equipmentType')).toBeFalsy()
  expect(inputs.find((i) => i.attributes('name') === 'equipmentId')).toBeFalsy()
})
