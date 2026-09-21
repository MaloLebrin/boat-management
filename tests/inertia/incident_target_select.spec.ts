import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import IncidentTargetSelect from '../../inertia/components/boats/incidents/IncidentTargetSelect.vue'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))
vi.mock('~/composables/use_t', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('~/components/base/BaseSelect.vue', () => ({
  default: {
    props: ['options', 'modelValue', 'placeholder'],
    emits: ['update:modelValue'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="">{{ placeholder }}</option><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
  },
}))

const equipment = {
  engines: [
    {
      id: 12,
      kind: 'outboard',
      fuel: null,
      strokeType: null,
      family: null,
      brand: 'Yamaha',
      model: 'F100',
      serialNumber: null,
      hours: null,
    },
  ],
  sails: [{ id: 3, sailType: 'mainsail', areaM2: null }],
  rig: { id: 1 },
  safetyEquipment: [{ id: 4, equipmentType: 'life_jacket' }],
  genericEquipment: [{ id: 5, name: 'Windlass', category: 'anchoring' as const }],
}

describe('IncidentTargetSelect (#813)', () => {
  test('lists every equipment family of the boat, prefixed with its family', () => {
    const w = mount(IncidentTargetSelect, { props: { equipment, target: null } })

    const labels = w.findAll('option').map((o) => o.text())
    expect(labels[0]).toBe('incidents.target.wholeBoat')
    expect(labels).toContain(
      'incidents.target.engine · boats.options.engineKind.outboard · Yamaha F100'
    )
    expect(labels).toContain('incidents.target.rig')
    expect(labels).toContain('incidents.target.generic · Windlass')
    expect(w.findAll('option')).toHaveLength(6)
  })

  test('selecting an option emits the typed reference, the empty option resets to null', async () => {
    const w = mount(IncidentTargetSelect, { props: { equipment, target: null } })

    await w.find('select').setValue('sail:3')
    expect(w.emitted('update:target')?.at(-1)).toEqual([{ type: 'sail', id: 3 }])

    await w.find('select').setValue('')
    expect(w.emitted('update:target')?.at(-1)).toEqual([null])
  })

  test('renders nothing without equipment data (fleet page, dashboard)', () => {
    const w = mount(IncidentTargetSelect, { props: { equipment: null, target: null } })

    expect(w.find('select').exists()).toBe(false)
    expect(w.find('[data-testid="incident-locked-target"]').exists()).toBe(false)
  })

  test('locked: shows a read-only chip with the equipment label instead of the select', () => {
    const w = mount(IncidentTargetSelect, {
      props: {
        equipment,
        target: { type: 'engine', id: 12 },
        lockedTarget: { type: 'engine', id: 12 },
      },
    })

    expect(w.find('select').exists()).toBe(false)
    expect(w.find('[data-testid="incident-locked-target"]').text()).toBe(
      'incidents.target.engine · boats.options.engineKind.outboard · Yamaha F100'
    )
  })

  test('locked on a part: the label comes from lockedLabel, unknown to the boat', () => {
    const w = mount(IncidentTargetSelect, {
      props: {
        equipment: null,
        target: { type: 'engine_part', id: 7 },
        lockedTarget: { type: 'engine_part', id: 7 },
        lockedLabel: 'Bougie NGK',
      },
    })

    expect(w.find('[data-testid="incident-locked-target"]').text()).toBe(
      'incidents.target.engine_part · Bougie NGK'
    )
  })
})
