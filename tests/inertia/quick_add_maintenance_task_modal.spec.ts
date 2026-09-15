import { mount } from '@vue/test-utils'
import { beforeEach, expect, test, vi } from 'vitest'
import { ref } from 'vue'

const mockReload = vi.fn()

vi.mock('@inertiajs/vue3', () => ({
  router: { reload: (...args: unknown[]) => mockReload(...args) },
  useRemember: (initial: unknown) => ref(initial),
}))
vi.mock('~/composables/use_t', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('~/components/base/BaseModal.vue', () => ({
  default: { props: ['open'], template: '<div v-if="open"><slot /></div>' },
}))
vi.mock('~/components/boats/maintenance/BoatMaintenanceTaskForm.vue', () => ({
  default: {
    props: ['boatId', 'equipment'],
    template: '<div data-testid="task-form" :data-boat="boatId" />',
  },
}))

import QuickAddMaintenanceTaskModal from '../../inertia/components/dashboard/QuickAddMaintenanceTaskModal.vue'

const boats = [
  { id: 1, name: 'Bel Ami' },
  { id: 2, name: 'Mistral II' },
]
const emptyEquipment = {
  engines: [],
  sails: [],
  rig: null,
  safetyEquipment: [],
  genericEquipment: [],
}

beforeEach(() => mockReload.mockReset())

test('choosing a boat reloads only its equipment, then shows the form', async () => {
  const w = mount(QuickAddMaintenanceTaskModal, { props: { boats } })
  ;(w.vm as unknown as { openModal: () => void }).openModal()
  await w.vm.$nextTick()

  expect(w.find('[data-testid="task-form"]').exists()).toBe(false)
  await w.find('select[name="taskBoatId"]').setValue('2')

  expect(mockReload).toHaveBeenCalledWith({ only: ['taskEquipment'], data: { taskBoatId: '2' } })

  await w.setProps({ taskEquipment: { boatId: 2, equipment: emptyEquipment } })
  expect(w.find('[data-testid="task-form"]').attributes('data-boat')).toBe('2')
})

test('equipment loaded for another boat is never used', async () => {
  const w = mount(QuickAddMaintenanceTaskModal, {
    props: { boats, taskEquipment: { boatId: 1, equipment: emptyEquipment } },
  })
  ;(w.vm as unknown as { openModal: () => void }).openModal()
  await w.vm.$nextTick()
  await w.find('select[name="taskBoatId"]').setValue('2')

  expect(w.find('[data-testid="task-form"]').exists()).toBe(false)
})
