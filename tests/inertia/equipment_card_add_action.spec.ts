import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import { suggestEquipmentActionType } from '../../shared/helpers/equipment_action'
import BoatGenericEquipmentCard from '../../inertia/components/boats/equipment/BoatGenericEquipmentCard.vue'
import BoatSafetyEquipmentCard from '../../inertia/components/boats/safety/BoatSafetyEquipmentCard.vue'
import type {
  BoatShowGenericEquipment,
  BoatShowSafetyEquipment,
} from '../../inertia/types/boat_show'

vi.mock('~/composables/use_t', () => ({ useT: () => ({ t: (k: string) => k }) }))
vi.mock('@adonisjs/inertia/vue', () => ({
  Form: { template: '<form><slot :processing="false" :errors="{}" /></form>' },
}))
vi.mock('~/components/base/BaseCard.vue', () => ({
  default: { template: '<div><slot name="header" /><slot /></div>' },
}))
vi.mock('~/components/base/BaseModal.vue', () => ({
  default: { template: '<div v-if="open"><slot /></div>', props: ['open', 'title', 'closeLabel'] },
}))
vi.mock('~/components/base/BaseBadge.vue', () => ({
  default: { template: '<span><slot /></span>', props: ['variant'] },
}))
vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :data-variant="variant" @click="$emit(\'click\')"><slot /></button>',
    props: ['variant', 'size', 'type', 'disabled', 'ariaLabel'],
  },
}))
vi.mock('../../inertia/components/boats/equipment/BoatGenericEquipmentFields.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('../../inertia/components/boats/safety/BoatSafetyEquipmentFields.vue', () => ({
  default: { template: '<div />' },
}))

function addButtons(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('button').filter((b) => b.text() === 'equipmentActions.prefill.addButton')
}

describe('suggestEquipmentActionType', () => {
  test('maps degraded statuses to an action type', () => {
    expect(suggestEquipmentActionType('to_replace')).toBe('to_replace')
    expect(suggestEquipmentActionType('expired')).toBe('to_replace')
    expect(suggestEquipmentActionType('to_check')).toBe('to_repair')
  })
})

describe('BoatGenericEquipmentCard — add-to-actions (#313)', () => {
  const items: BoatShowGenericEquipment[] = [
    {
      id: 1,
      category: 'deck',
      name: 'Winch',
      brand: null,
      model: null,
      quantity: null,
      status: 'to_replace',
      notes: null,
    },
    {
      id: 2,
      category: 'deck',
      name: 'GPS',
      brand: null,
      model: null,
      quantity: null,
      status: 'ok',
      notes: null,
    },
  ]

  test('shows the button only for degraded items and emits the prefill payload', async () => {
    const w = mount(BoatGenericEquipmentCard, {
      props: { boatId: 3, items, canManage: true, canManageActions: true },
    })
    const buttons = addButtons(w)
    expect(buttons).toHaveLength(1) // only the to_replace item

    await buttons[0].trigger('click')
    expect(w.emitted('addToActions')?.[0][0]).toEqual({
      equipmentType: 'generic',
      equipmentId: 1,
      label: 'Winch',
      actionType: 'to_replace',
    })
  })

  test('hides the button when canManageActions is false', () => {
    const w = mount(BoatGenericEquipmentCard, {
      props: { boatId: 3, items, canManage: true, canManageActions: false },
    })
    expect(addButtons(w)).toHaveLength(0)
  })
})

describe('BoatSafetyEquipmentCard — add-to-actions (#313)', () => {
  const items: BoatShowSafetyEquipment[] = [
    {
      id: 8,
      equipmentType: 'lifejacket',
      quantity: null,
      expiryDate: null,
      status: 'expired',
      notes: null,
    },
    { id: 9, equipmentType: 'flare', quantity: null, expiryDate: null, status: 'ok', notes: null },
  ]

  test('emits prefill with safety type and suggested action', async () => {
    const w = mount(BoatSafetyEquipmentCard, {
      props: { boatId: 3, items, canManage: true, canManageActions: true },
    })
    const buttons = addButtons(w)
    expect(buttons).toHaveLength(1)

    await buttons[0].trigger('click')
    expect(w.emitted('addToActions')?.[0][0]).toEqual({
      equipmentType: 'safety',
      equipmentId: 8,
      label: 'boats.options.safetyEquipmentType.lifejacket',
      actionType: 'to_replace',
    })
  })
})
