import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import BoatShowEnginesCard from '../../inertia/components/boats/engine/BoatShowEnginesCard.vue'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      appT: {
        'boats.options.strokeTypeShort.2_stroke': '2T',
        'boats.options.strokeTypeShort.4_stroke': '4T',
      },
      locale: 'fr',
    },
  }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a><slot /></a>' },
  Form: { template: '<form><slot v-bind="{ errors: {}, processing: false }" /></form>' },
}))

vi.mock('~/composables/use_engine_form_draft', () => ({
  shouldReopenEngineForm: () => false,
}))

vi.mock('~/components/boats/engine/BoatEquipmentEngineFields.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('~/components/boats/engine/EngineHoursQuickAddForm.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('~/components/base/BaseModal.vue', () => ({ default: { template: '<div />' } }))
vi.mock('~/components/boats/maintenance/EquipmentAddTaskButton.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('~/components/base/BaseButton.vue', () => ({
  default: { template: '<button><slot /></button>' },
}))

function engine(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    kind: 'outboard',
    fuel: null,
    strokeType: null,
    family: null,
    brand: 'Yamaha',
    model: 'F40',
    serialNumber: null,
    manufacturedAt: null,
    powerHp: null,
    hours: null,
    installHours: null,
    status: 'operational',
    notes: null,
    documents: [],
    photos: [],
    parts: [],
    ...overrides,
  }
}

function badges(engines: unknown[]) {
  const wrapper = mount(BoatShowEnginesCard, {
    props: { boatId: 1, engines: engines as any, canManage: false },
  })
  return wrapper.text()
}

describe('BoatShowEnginesCard — badge de cycle moteur', () => {
  test('affiche le cycle saisi ou déduit', () => {
    const text = badges([
      engine({ id: 1, strokeType: '2_stroke' }),
      engine({ id: 2, kind: 'inboard', family: 'inboard_diesel_shaft' }),
    ])

    expect(text).toContain('2T')
    expect(text).toContain('4T')
  })

  test('n’affiche aucun badge quand le cycle est indécidable', () => {
    const text = badges([engine({ fuel: 'essence' })])

    expect(text).not.toContain('2T')
    expect(text).not.toContain('4T')
  })
})
