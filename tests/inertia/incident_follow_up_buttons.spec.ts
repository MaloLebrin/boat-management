import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    // Comme le vrai BaseButton : le listener `click` du parent retombe sur la racine.
    template: '<button v-bind="$attrs"><slot /></button>',
    inheritAttrs: false,
  },
}))

import IncidentFollowUpButtons from '../../inertia/components/boats/incidents/IncidentFollowUpButtons.vue'

const incident = {
  id: 42,
  type: 'engine_failure',
  target: { type: 'engine', id: 12, name: 'Yamaha F100' },
} as never

function mountButtons(rights: { canCreateTask?: boolean; canCreateAction?: boolean } = {}) {
  return mount(IncidentFollowUpButtons, { props: { incident, ...rights } })
}

describe('IncidentFollowUpButtons (#815)', () => {
  test('« Créer une tâche » émet un pré-remplissage titré, verrouillé sur l’équipement', async () => {
    const w = mountButtons({ canCreateTask: true, canCreateAction: true })

    await w.find('[data-testid="incident-create-task"]').trigger('click')

    expect(w.emitted('createTask')).toEqual([
      [
        {
          prefill: {
            title: 'incidents.type.engine_failure',
            boatIncidentId: 42,
            equipment: { type: 'engine', id: 12 },
          },
          lockEquipment: true,
        },
      ],
    ])
  })

  test('« Action à réparer » émet une action to_repair tracée par l’incident', async () => {
    const w = mountButtons({ canCreateTask: true, canCreateAction: true })

    await w.find('[data-testid="incident-create-action"]').trigger('click')

    expect(w.emitted('createAction')).toEqual([
      [
        {
          label: 'incidents.type.engine_failure',
          actionType: 'to_repair',
          boatIncidentId: 42,
          equipmentType: 'engine',
          equipmentId: 12,
        },
      ],
    ])
  })

  test('chaque bouton suit sa propre capacité', () => {
    const taskOnly = mountButtons({ canCreateTask: true })
    expect(taskOnly.find('[data-testid="incident-create-task"]').exists()).toBe(true)
    expect(taskOnly.find('[data-testid="incident-create-action"]').exists()).toBe(false)

    const none = mountButtons()
    expect(none.findAll('button')).toHaveLength(0)
  })
})
