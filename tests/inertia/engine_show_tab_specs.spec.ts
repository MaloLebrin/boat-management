import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import EngineShowTabSpecs from '../../inertia/components/engine/show/tabs/EngineShowTabSpecs.vue'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      appT: {
        'boats.engineShow.specs.strokeType': 'Cycle moteur',
        'boats.options.strokeType.2_stroke': '2 temps',
        'boats.options.strokeType.4_stroke': '4 temps',
      },
      locale: 'fr',
    },
  }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: { template: '<button><slot /></button>' },
}))

function engine(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    kind: 'outboard',
    fuel: 'essence',
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
  } as any
}

function mountSpecs(overrides: Record<string, unknown>) {
  return mount(EngineShowTabSpecs, {
    props: {
      boat: { id: 1, name: 'Bora Bora' },
      engine: engine(overrides),
      openTasks: [],
      canManage: false,
    },
  })
}

describe('EngineShowTabSpecs — cycle moteur', () => {
  test('affiche le cycle saisi', () => {
    const wrapper = mountSpecs({ strokeType: '2_stroke' })

    expect(wrapper.text()).toContain('Cycle moteur')
    expect(wrapper.text()).toContain('2 temps')
  })

  test('affiche le cycle déduit quand il n’est pas saisi', () => {
    const wrapper = mountSpecs({ kind: 'inboard', fuel: 'diesel' })

    expect(wrapper.text()).toContain('4 temps')
  })

  test('masque la ligne quand le cycle est indécidable', () => {
    const wrapper = mountSpecs({})

    expect(wrapper.text()).not.toContain('Cycle moteur')
  })
})
