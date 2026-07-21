import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import BoatTaskActions from '../../inertia/components/boats/maintenance/BoatTaskActions.vue'
import type { MaintenanceTaskRow } from '../../inertia/types/boat_show'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: {
    props: ['action'],
    template:
      '<form :data-url="action.url" :data-method="action.method"><slot :processing="false" /></form>',
  },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: { template: '<button><slot /></button>' },
}))

vi.mock('~/components/base/BaseInput.vue', () => ({
  default: { props: ['name'], template: '<input :name="name" />' },
}))

const baseTask: MaintenanceTaskRow = {
  id: 1,
  subject: 'boat',
  title: 'Change oil',
  notes: null,
  status: 'open',
  dueAt: '2026-08-01',
  dueEngineHours: null,
  boatEngineId: null,
  boatSailId: null,
  boatRigId: null,
  recurrenceIntervalMonths: null,
  recurrenceIntervalEngineHours: null,
}

describe('BoatTaskActions (#407)', () => {
  test('renders a PUT done form and a DELETE form pointing at the task', () => {
    const w = mount(BoatTaskActions, { props: { boatId: 7, task: baseTask } })
    const forms = w.findAll('form')
    expect(forms).toHaveLength(2)

    const doneForm = forms.find((f) => f.attributes('data-method') === 'put')!
    expect(doneForm.attributes('data-url')).toBe('/boats/7/maintenance-tasks/1/done')

    const deleteForm = forms.find((f) => f.attributes('data-method') === 'delete')!
    expect(deleteForm.attributes('data-url')).toBe('/boats/7/maintenance-tasks/1')

    // Libellé de clôture unifié.
    expect(w.text()).toContain('boats.maintenance.tasks.markDone')
    // Pas de saisie d'heures moteur pour une tâche datée.
    expect(w.find('input[name="doneEngineHours"]').exists()).toBe(false)
  })

  test('asks for the engine-hour reading when the task is milestone-based', () => {
    const w = mount(BoatTaskActions, {
      props: { boatId: 7, task: { ...baseTask, dueAt: null, dueEngineHours: 250 } },
    })
    expect(w.find('input[name="doneEngineHours"]').exists()).toBe(true)
  })
})
