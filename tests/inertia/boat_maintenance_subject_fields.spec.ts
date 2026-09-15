import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import BoatMaintenanceSubjectFields from '../../inertia/components/boats/show/modals/BoatMaintenanceSubjectFields.vue'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      appT: {
        'boats.options.engineKind.outboard': 'Hors-bord',
        'boats.options.strokeTypeShort.2_stroke': '2T',
      },
      locale: 'fr',
    },
  }),
}))

vi.mock('~/components/base/BaseSelect.vue', () => ({
  default: {
    props: ['options'],
    template: '<select><option v-for="o in options" :key="o.value">{{ o.label }}</option></select>',
  },
}))
vi.mock('~/components/base/BaseInput.vue', () => ({ default: { template: '<input />' } }))

function mountFields(engines: unknown[]) {
  return mount(BoatMaintenanceSubjectFields, {
    props: {
      boat: { id: 1, engines, sails: [], safetyEquipment: [] } as any,
      subject: 'engine',
      errors: {},
    },
  })
}

describe('BoatMaintenanceSubjectFields — libellé moteur', () => {
  test('ajoute le cycle moteur au libellé de l’option', () => {
    const wrapper = mountFields([
      { id: 1, kind: 'outboard', strokeType: '2_stroke', brand: 'Yamaha', model: '40' },
    ])

    expect(wrapper.findAll('option').map((o) => o.text())).toEqual(['Hors-bord · Yamaha 40 · 2T'])
  })

  test('n’ajoute rien quand le cycle est indécidable', () => {
    const wrapper = mountFields([
      { id: 1, kind: 'outboard', fuel: 'essence', brand: 'Yamaha', model: '40' },
    ])

    expect(wrapper.findAll('option').map((o) => o.text())).toEqual(['Hors-bord · Yamaha 40'])
  })
})
