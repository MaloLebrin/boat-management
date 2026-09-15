import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import type { MaintenanceTaskRow } from '../../inertia/types/boat_show'

vi.mock('~/composables/use_t', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDate: (iso: string) => `date:${iso}` }),
}))
vi.mock('~/components/base/BaseCard.vue', () => ({
  default: { template: '<div><slot name="header" /><slot /></div>' },
}))
vi.mock('~/components/base/BaseButton.vue', () => ({
  default: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
}))
vi.mock('~/components/boats/maintenance/MaintenanceTaskQuickAdd.vue', () => ({
  default: { props: ['boatId', 'equipment'], template: '<div data-testid="quick-add" />' },
}))
vi.mock('~/components/boats/maintenance/BoatTaskActions.vue', () => ({
  default: { props: ['boatId', 'task'], template: '<div data-testid="task-actions" />' },
}))
vi.mock('~/components/boats/maintenance/BoatMaintenanceTaskModal.vue', () => ({
  default: {
    props: {
      open: Boolean,
      boatId: Number,
      equipment: Object,
      prefill: Object,
      lockEquipment: Boolean,
    },
    template:
      '<div data-testid="task-modal" :data-open="open" :data-locked="lockEquipment" :data-ref="JSON.stringify(prefill)" />',
  },
}))

import EquipmentTasksSection from '../../inertia/components/boats/maintenance/EquipmentTasksSection.vue'

const baseTask: MaintenanceTaskRow = {
  id: 1,
  subject: 'safety',
  title: 'Check flares',
  notes: null,
  status: 'open',
  dueAt: null,
  dueEngineHours: null,
  boatEngineId: null,
  boatSailId: null,
  boatRigId: null,
  boatSafetyEquipmentId: 30,
  boatGenericEquipmentId: null,
  recurrenceIntervalMonths: null,
  recurrenceIntervalEngineHours: null,
}

const equipment = { engines: [], sails: [], rig: null, safetyEquipment: [], genericEquipment: [] }

function mountSection(permissions = { canCreate: true, canEdit: true, canDelete: true }) {
  return mount(EquipmentTasksSection, {
    props: {
      boatId: 7,
      equipmentRef: { type: 'safety', id: 30 },
      equipment,
      tasks: [
        baseTask,
        { ...baseTask, id: 2, title: 'Replace raft', dueAt: '2027-01-01' },
        { ...baseTask, id: 3, title: 'Old job', status: 'done' },
      ],
      permissions,
    },
  })
}

test('lists open tasks with an undated badge and folds done tasks', () => {
  const w = mountSection()

  const open = w.find('[data-testid="equipment-open-tasks"]')
  expect(open.findAll('li')).toHaveLength(2)
  expect(open.text()).toContain('boats.show.tasksFilter.undated')
  expect(open.text()).toContain('date:2027-01-01')
  expect(w.find('details').text()).toContain('Old job')
})

test('the add button opens the modal locked on the equipment', async () => {
  const w = mountSection()

  expect(w.find('[data-testid="task-modal"]').attributes('data-open')).toBe('false')
  await w.find('button').trigger('click')

  const modal = w.find('[data-testid="task-modal"]')
  expect(modal.attributes('data-open')).toBe('true')
  expect(modal.attributes('data-locked')).toBe('true')
  expect(JSON.parse(modal.attributes('data-ref')!)).toEqual({
    equipment: { type: 'safety', id: 30 },
  })
})

test('read-only users see the list without creation or actions', () => {
  const w = mountSection({ canCreate: false, canEdit: false, canDelete: false })

  expect(w.find('[data-testid="quick-add"]').exists()).toBe(false)
  expect(w.find('[data-testid="task-modal"]').exists()).toBe(false)
  expect(w.find('[data-testid="task-actions"]').exists()).toBe(false)
  expect(w.find('button').exists()).toBe(false)
})
