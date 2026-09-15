import { describe, expect, test, vi } from 'vitest'
import { useTaskEquipmentOptions } from '../../inertia/composables/use_task_equipment_options'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      appT: {
        'boats.options.engineKind.outboard': 'Hors-bord',
        'boats.options.engineKind.inboard': 'In-bord',
        'boats.options.strokeTypeShort.2_stroke': '2T',
        'boats.options.strokeTypeShort.4_stroke': '4T',
        'boats.engines.sn': 'N° série',
      },
      locale: 'fr',
    },
  }),
}))

function source(engines: unknown[]) {
  return {
    engines,
    sails: [],
    rig: null,
    safetyEquipment: [],
    genericEquipment: [],
  } as any
}

function engine(overrides: Record<string, unknown>) {
  return {
    id: 1,
    kind: 'outboard',
    fuel: null,
    strokeType: null,
    family: null,
    brand: 'Yamaha',
    model: '40',
    serialNumber: null,
    ...overrides,
  }
}

describe('useTaskEquipmentOptions — libellé moteur', () => {
  test('ajoute le cycle entre le nom et le numéro de série', () => {
    const { engineOptions } = useTaskEquipmentOptions(
      source([
        engine({ id: 1, strokeType: '2_stroke', serialNumber: 'SN-1' }),
        engine({
          id: 2,
          kind: 'inboard',
          family: 'inboard_diesel_shaft',
          brand: 'Volvo',
          model: 'D2',
        }),
      ])
    )

    expect(engineOptions.value.map((o) => o.label)).toEqual([
      'Hors-bord · Yamaha 40 · 2T · N° série SN-1',
      'In-bord · Volvo D2 · 4T',
    ])
  })

  test('n’ajoute rien quand le cycle est indécidable', () => {
    const { engineOptions } = useTaskEquipmentOptions(source([engine({ fuel: 'essence' })]))

    expect(engineOptions.value[0].label).toBe('Hors-bord · Yamaha 40')
  })
})
