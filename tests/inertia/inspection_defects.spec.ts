import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockRouterDelete = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  router: { delete: mockRouterDelete },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/composables/use_currency_format', () => ({
  useCurrencyFormat: () => ({ formatCurrency: (n: number) => `${n} €` }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button @click="$emit(\'click\')"><slot /></button>',
    props: ['variant', 'size'],
  },
}))

vi.mock('~/components/base/BaseBadge.vue', () => ({
  default: { template: '<span><slot /></span>', props: ['variant'] },
}))

vi.mock('~/components/base/BaseConfirmModal.vue', () => ({
  default: {
    template:
      '<div v-if="open" class="confirm"><button class="do-confirm" @click="$emit(\'confirm\')" /></div>',
    props: ['open', 'title', 'message', 'confirmLabel'],
  },
}))

vi.mock('~/components/reservations/inspection/InspectionDefectModal.vue', () => ({
  default: { template: '<div />', props: ['boatId', 'reservationId', 'inspectionId', 'open'] },
}))

import InspectionDefects from '../../inertia/components/reservations/inspection/InspectionDefects.vue'

function makeAction(overrides = {}) {
  return {
    id: 5,
    boatId: 1,
    actionType: 'to_replace' as const,
    status: 'pending' as const,
    label: 'Winch tribord',
    notes: null,
    estimatedCost: 120,
    actualCost: null,
    equipmentType: null,
    equipmentId: null,
    inspectionId: 9,
    resolvedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 1,
    ...overrides,
  }
}

const baseProps = { boatId: 3, reservationId: 7, inspectionId: 9, canManage: true, canDelete: true }

describe('InspectionDefects', () => {
  beforeEach(() => vi.clearAllMocks())

  test('shows empty state when no actions', () => {
    const wrapper = mount(InspectionDefects, { props: { ...baseProps, actions: [] } })
    expect(wrapper.text()).toContain('equipmentActions.defects.empty')
  })

  test('lists actions with label and estimated cost', () => {
    const wrapper = mount(InspectionDefects, { props: { ...baseProps, actions: [makeAction()] } })
    expect(wrapper.text()).toContain('Winch tribord')
    expect(wrapper.text()).toContain('120 €')
  })

  test('confirming deletion calls router.delete with the nested URL', async () => {
    const wrapper = mount(InspectionDefects, { props: { ...baseProps, actions: [makeAction()] } })
    await wrapper.find('button[type="button"]').trigger('click') // open confirm (delete button)
    await wrapper.find('.do-confirm').trigger('click')
    expect(mockRouterDelete).toHaveBeenCalledWith(
      '/boats/3/reservations/7/inspections/9/equipment-actions/5',
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('hides delete action when canDelete is false', () => {
    const wrapper = mount(InspectionDefects, {
      props: { ...baseProps, canDelete: false, actions: [makeAction()] },
    })
    expect(wrapper.find('button[type="button"]').exists()).toBe(false)
  })
})
