import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockRouterPatch = vi.hoisted(() => vi.fn())
const mockRouterDelete = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  router: { patch: mockRouterPatch, delete: mockRouterDelete },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['variant', 'size', 'disabled', 'type'],
  },
}))

vi.mock('~/components/base/BaseTextarea.vue', () => ({
  default: {
    template:
      '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'label', 'placeholder', 'rows', 'id', 'name'],
  },
}))

vi.mock('~/components/reservations/inspection/InspectionDefectModal.vue', () => ({
  default: {
    template: '<div class="defect-modal" :data-open="open" :data-label="prefill?.label" />',
    props: ['boatId', 'reservationId', 'inspectionId', 'open', 'prefill'],
  },
}))

import InspectionChecklist from '../../inertia/components/reservations/inspection/InspectionChecklist.vue'
import type { BoatInspectionItemRow } from '../../shared/types/inspection'

const baseProps = {
  boatId: 3,
  reservationId: 7,
  inspectionId: 9,
  category: null,
  items: [] as BoatInspectionItemRow[],
  counterpartItems: null,
  canEdit: true,
  canManageActions: true,
}

const ITEMS_URL = '/boats/3/reservations/7/inspections/9/items'

function makeRow(overrides: Partial<BoatInspectionItemRow> = {}): BoatInspectionItemRow {
  return { id: 1, itemKey: 'hull_deck.hull_condition', state: 'ok', note: null, ...overrides }
}

describe('InspectionChecklist', () => {
  beforeEach(() => vi.clearAllMocks())

  test('filters sections by boat category', () => {
    const motor = mount(InspectionChecklist, { props: { ...baseProps, category: 'motor_yacht' } })
    expect(motor.text()).not.toContain('inspections.checklist.sections.rigging.title')

    const sail = mount(InspectionChecklist, {
      props: { ...baseProps, category: 'sailboat_monohull' },
    })
    expect(sail.text()).toContain('inspections.checklist.sections.rigging.title')
  })

  test('renders the whole checklist when the category is unknown', () => {
    const wrapper = mount(InspectionChecklist, { props: baseProps })
    expect(wrapper.text()).toContain('inspections.checklist.sections.rigging.title')
    expect(wrapper.text()).toContain('inspections.checklist.sections.interior.title')
  })

  test('a tap on OK patches the item state', async () => {
    const wrapper = mount(InspectionChecklist, { props: baseProps })
    await wrapper.find('button[aria-pressed]').trigger('click')

    expect(mockRouterPatch).toHaveBeenCalledWith(
      ITEMS_URL,
      { itemKey: 'hull_deck.hull_condition', state: 'ok' },
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('a second tap on an OK item resets it to not inspected', async () => {
    const wrapper = mount(InspectionChecklist, {
      props: { ...baseProps, items: [makeRow({ state: 'ok' })] },
    })
    await wrapper.find('button[aria-pressed="true"]').trigger('click')

    expect(mockRouterDelete).toHaveBeenCalledWith(
      ITEMS_URL,
      expect.objectContaining({ data: { itemKey: 'hull_deck.hull_condition' } })
    )
  })

  test('remark requires a note before saving', async () => {
    const wrapper = mount(InspectionChecklist, { props: baseProps })
    const [, remarkButton] = wrapper.findAll('button[aria-pressed]')
    await remarkButton.trigger('click')

    // Éditeur ouvert, note vide → aucun envoi possible
    expect(wrapper.text()).toContain('inspections.checklist.noteRequired')
    const save = wrapper
      .findAll('button')
      .find((button) => button.text() === 'inspections.checklist.save')!
    await save.trigger('click')
    expect(mockRouterPatch).not.toHaveBeenCalled()

    await wrapper.find('textarea').setValue('Rayure sur le gelcoat')
    await save.trigger('click')
    expect(mockRouterPatch).toHaveBeenCalledWith(
      ITEMS_URL,
      { itemKey: 'hull_deck.hull_condition', state: 'remark', note: 'Rayure sur le gelcoat' },
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('shows the checkout state alongside checkin items and flags degradations', () => {
    const wrapper = mount(InspectionChecklist, {
      props: {
        ...baseProps,
        items: [makeRow({ state: 'damage', note: 'Impact tribord' })],
        counterpartItems: [makeRow({ id: 2, state: 'ok' })],
      },
    })

    expect(wrapper.text()).toContain('inspections.checklist.checkoutLabel')
    expect(wrapper.text()).toContain('inspections.checklist.degraded')
  })

  test('a damage opens the prefilled equipment action modal', async () => {
    const wrapper = mount(InspectionChecklist, {
      props: { ...baseProps, items: [makeRow({ state: 'damage', note: 'Impact tribord' })] },
    })

    const createAction = wrapper
      .findAll('button')
      .find((button) => button.text() === 'inspections.checklist.createAction')!
    await createAction.trigger('click')

    const modal = wrapper.find('.defect-modal')
    expect(modal.attributes('data-open')).toBe('true')
    expect(modal.attributes('data-label')).toBe(
      'inspections.checklist.sections.hull_deck.items.hull_condition'
    )
  })

  test('read-only users cannot toggle anything', async () => {
    const wrapper = mount(InspectionChecklist, { props: { ...baseProps, canEdit: false } })
    await wrapper.find('button[aria-pressed]').trigger('click')
    expect(mockRouterPatch).not.toHaveBeenCalled()
    expect(mockRouterDelete).not.toHaveBeenCalled()
  })
})
