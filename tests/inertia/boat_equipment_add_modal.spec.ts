import { mount, config } from '@vue/test-utils'
import { test, expect, vi, beforeAll, afterAll } from 'vitest'
import BoatEquipmentAddModal from '../../inertia/components/boats/show/modals/BoatEquipmentAddModal.vue'
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
    props: ['open', 'title', 'subtitle', 'closeLabel', 'size'],
    emits: ['update:open'],
  },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: { template: '<button @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
}))

vi.mock('~/components/boats/engine/BoatEquipmentEngineFields.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('~/components/boats/equipment/BoatGenericEquipmentFields.vue', () => ({
  default: {
    name: 'BoatGenericEquipmentFields',
    template: '<div class="generic-fields" />',
    props: ['errors', 'initialCategory', 'categoryLocked', 'surface'],
  },
}))
vi.mock('~/components/boats/rig/BoatEquipmentRigFields.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('~/components/boats/safety/BoatSafetyEquipmentFields.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('~/components/boats/sail/BoatEquipmentSailFields.vue', () => ({
  default: { template: '<div />' },
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

let originalTeleport: (typeof config.global.stubs)['teleport']

beforeAll(() => {
  originalTeleport = config.global.stubs.teleport
  config.global.stubs.teleport = true
})

afterAll(() => {
  config.global.stubs.teleport = originalTeleport
})

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}☀-➿]/u

test('renders category buttons as SVG icons instead of emoji', () => {
  const w = mount(BoatEquipmentAddModal, {
    props: { boat: minimalBoat, canManageEquipment: true, open: true },
  })
  const buttons = w.findAll('button').filter((b) => b.find('svg').exists())
  expect(buttons.length).toBe(12)
  // Plus aucune tuile « bientôt disponible » (#893).
  expect(buttons.every((b) => b.attributes('disabled') === undefined)).toBe(true)
  expect(w.text()).not.toMatch(EMOJI_REGEX)
})

test('switches category on click', async () => {
  const w = mount(BoatEquipmentAddModal, {
    props: { boat: minimalBoat, canManageEquipment: true, open: true },
  })
  const sailButton = w
    .findAll('button')
    .find((b) => b.text().includes('boats.equipmentAddModal.categories.sail'))
  await sailButton?.trigger('click')
  expect(sailButton?.classes()).toContain('bg-brand')
})

test('la tuile « Autre » ouvre le formulaire d’équipement générique (#893)', async () => {
  const w = mount(BoatEquipmentAddModal, {
    props: { boat: minimalBoat, canManageEquipment: true, open: true },
  })
  const otherButton = w
    .findAll('button')
    .find((b) => b.text().includes('boats.equipmentAddModal.categories.other'))
  await otherButton?.trigger('click')

  expect(otherButton?.classes()).toContain('bg-brand')
  expect(w.text()).not.toContain('comingSoon')
  const fields = w.findComponent({ name: 'BoatGenericEquipmentFields' })
  expect(fields.exists()).toBe(true)
  expect(fields.props('initialCategory')).toBe('other')
  expect(fields.props('categoryLocked')).not.toBe(false)
})
