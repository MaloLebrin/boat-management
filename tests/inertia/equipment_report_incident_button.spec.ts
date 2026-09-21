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
import BoatShowEnginesCard from '../../inertia/components/boats/engine/BoatShowEnginesCard.vue'

const rig = {
  id: 9,
  rigType: 'sloop',
  manufacturedAt: null,
  mastCount: 1,
  spreaders: 2,
  status: 'operational' as const,
}

test('the rig card emits reportIncident with the rig reference (#813)', async () => {
  const w = mount(BoatShowRigCard, {
    props: { boatId: 7, rig, canManage: false, canReportIncident: true },
  })

  await w.find('[data-testid="equipment-report-incident"]').trigger('click')

  expect(w.emitted('reportIncident')).toEqual([[{ type: 'rig', id: 9 }]])
})

test('the shortcut is hidden without the incidents.create right', () => {
  const w = mount(BoatShowRigCard, { props: { boatId: 7, rig, canManage: false } })

  expect(w.find('[data-testid="equipment-report-incident"]').exists()).toBe(false)
})

test('the engines card emits one reference per engine', async () => {
  const w = mount(BoatShowEnginesCard, {
    props: {
      boatId: 7,
      canManage: false,
      canReportIncident: true,
      engines: [
        {
          id: 12,
          kind: 'outboard',
          fuel: null,
          family: null,
          brand: 'Yamaha',
          model: 'F100',
          serialNumber: null,
          manufacturedAt: null,
          powerHp: null,
          hours: null,
          status: 'operational',
        } as never,
      ],
    },
  })

  await w.find('[data-testid="equipment-report-incident"]').trigger('click')

  expect(w.emitted('reportIncident')).toEqual([[{ type: 'engine', id: 12 }]])
})

test('a generic equipment row emits reportIncident whatever its status', async () => {
  const w = mount(BoatGenericEquipmentRow, {
    props: {
      boatId: 7,
      canManage: false,
      canManageActions: false,
      canReportIncident: true,
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

  await w.find('[data-testid="equipment-report-incident"]').trigger('click')

  expect(w.emitted('reportIncident')).toEqual([[{ type: 'generic', id: 5 }]])
})
