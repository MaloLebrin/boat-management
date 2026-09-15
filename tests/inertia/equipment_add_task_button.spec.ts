import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('@adonisjs/inertia/vue', () => ({
  Form: { template: '<form><slot :processing="false" :errors="{}" /></form>' },
  Link: { template: '<a><slot /></a>' },
}))
vi.mock('~/components/base/BaseCard.vue', () => ({
  default: { template: '<div><slot name="header" /><slot /></div>' },
}))
vi.mock('~/components/base/BaseModal.vue', () => ({
  default: { template: '<div v-if="open"><slot /></div>', props: ['open'] },
}))
vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    // Comme le vrai BaseButton : le listener `click` du parent retombe sur la racine.
    template: '<button v-bind="$attrs"><slot /></button>',
    inheritAttrs: false,
  },
}))

import BoatShowRigCard from '../../inertia/components/boats/rig/BoatShowRigCard.vue'
import BoatGenericEquipmentRow from '../../inertia/components/boats/equipment/BoatGenericEquipmentRow.vue'
import BoatShowSailsCard from '../../inertia/components/boats/sail/BoatShowSailsCard.vue'

const rig = {
  id: 9,
  rigType: 'sloop',
  manufacturedAt: null,
  mastCount: 1,
  spreaders: 2,
  status: 'operational' as const,
}

test('the rig card emits addTask with the rig reference', async () => {
  const w = mount(BoatShowRigCard, {
    props: { boatId: 7, rig, canManage: false, canAddTask: true },
  })

  await w.find('[data-testid="equipment-add-task"]').trigger('click')

  expect(w.emitted('addTask')).toEqual([[{ type: 'rig', id: 9 }]])
})

test('the shortcut is hidden without the maintenance.create right', () => {
  const w = mount(BoatShowRigCard, { props: { boatId: 7, rig, canManage: false } })

  expect(w.find('[data-testid="equipment-add-task"]').exists()).toBe(false)
})

test('the sails card emits one reference per sail', async () => {
  const w = mount(BoatShowSailsCard, {
    props: {
      boatId: 7,
      canManage: false,
      canAddTask: true,
      sails: [
        {
          id: 3,
          sailType: 'mainsail',
          manufacturedAt: null,
          areaM2: 20,
          material: null,
          reefPoints: null,
          status: 'operational',
          sailmaker: null,
          sailLoftId: null,
        },
      ],
    },
  })

  await w.find('[data-testid="equipment-add-task"]').trigger('click')

  expect(w.emitted('addTask')).toEqual([[{ type: 'sail', id: 3 }]])
})

test('a generic equipment row emits addTask whatever its status', async () => {
  const w = mount(BoatGenericEquipmentRow, {
    props: {
      boatId: 7,
      canManage: false,
      canManageActions: false,
      canAddTask: true,
      item: {
        id: 5,
        category: 'anchoring',
        name: 'Windlass',
        brand: null,
        model: null,
        equipmentModelId: null,
        quantity: null,
        status: 'ok',
        notes: null,
      } as never,
    },
  })

  await w.find('[data-testid="equipment-add-task"]').trigger('click')

  expect(w.emitted('addTask')).toEqual([[{ type: 'generic', id: 5 }]])
})
