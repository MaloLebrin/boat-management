import { mount } from '@vue/test-utils'
import { describe, test, expect, vi } from 'vitest'
import BoatEquipmentActionCard from '../../inertia/components/boats/equipment-actions/BoatEquipmentActionCard.vue'
import type { BoatEquipmentActionRow } from '../../shared/types/equipment_action'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('~/composables/use_currency_format', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (v: number) => `${v.toFixed(2)} EUR`,
  }),
}))

vi.mock('~/components/base/BaseBadge.vue', () => ({
  default: { template: '<span><slot /></span>' },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: { template: '<button @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
}))

const sampleAction: BoatEquipmentActionRow = {
  id: 1,
  boatId: 10,
  actionType: 'to_buy',
  status: 'pending',
  label: 'New anchor',
  notes: 'Urgent replacement needed',
  estimatedCost: 250,
  actualCost: null,
  equipmentType: 'generic',
  equipmentId: 5,
  resolvedAt: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  createdBy: 1,
}

function mountCard(
  action: BoatEquipmentActionRow = sampleAction,
  canManage = true,
  canDelete = true
) {
  return mount(BoatEquipmentActionCard, {
    props: { action, canManage, canDelete },
  })
}

test('renders action label', () => {
  const w = mountCard()
  expect(w.text()).toContain('New anchor')
})

test('renders action type badge', () => {
  const w = mountCard()
  expect(w.text()).toContain('equipmentActions.actionType.to_buy')
})

test('renders status badge', () => {
  const w = mountCard()
  expect(w.text()).toContain('equipmentActions.status.pending')
})

test('renders notes when present', () => {
  const w = mountCard()
  expect(w.text()).toContain('Urgent replacement needed')
})

test('renders estimated cost when present', () => {
  const w = mountCard()
  expect(w.text()).toContain('250.00 EUR')
})

test('renders actual cost when present', () => {
  const actionWithActualCost: BoatEquipmentActionRow = {
    ...sampleAction,
    actualCost: 275.5,
  }
  const w = mountCard(actionWithActualCost)
  expect(w.text()).toContain('275.50 EUR')
})

test('renders equipment type when present', () => {
  const w = mountCard()
  expect(w.text()).toContain('equipmentActions.equipmentType.generic')
})

test('shows edit button when canManage is true', () => {
  const w = mountCard(sampleAction, true, false)
  expect(w.text()).toContain('equipmentActions.form.edit')
})

test('shows delete button when canDelete is true', () => {
  const w = mountCard(sampleAction, true, true)
  expect(w.text()).toContain('equipmentActions.form.delete')
})

test('does not show edit/delete buttons when canManage is false', () => {
  const w = mountCard(sampleAction, false, false)
  expect(w.text()).not.toContain('equipmentActions.form.edit')
  expect(w.text()).not.toContain('equipmentActions.form.delete')
})

test('does not show delete button when canDelete is false', () => {
  const w = mountCard(sampleAction, true, false)
  expect(w.text()).toContain('equipmentActions.form.edit')
  expect(w.text()).not.toContain('equipmentActions.form.delete')
})

test('emits edit event when edit button is clicked', async () => {
  const w = mountCard()
  const editButtons = w.findAll('button')
  const editButton = editButtons.find((b) => b.text().includes('equipmentActions.form.edit'))
  await editButton?.trigger('click')
  expect(w.emitted('edit')).toBeTruthy()
  expect(w.emitted('edit')![0]).toEqual([sampleAction])
})

test('emits delete event when delete button is clicked', async () => {
  const w = mountCard()
  const deleteButtons = w.findAll('button')
  const deleteButton = deleteButtons.find((b) => b.text().includes('equipmentActions.form.delete'))
  await deleteButton?.trigger('click')
  expect(w.emitted('delete')).toBeTruthy()
  expect(w.emitted('delete')![0]).toEqual([sampleAction.id])
})

test('applies correct background color for pending status', () => {
  const w = mountCard({ ...sampleAction, status: 'pending' })
  expect(w.find('div').classes()).toContain('bg-amber-50')
})

test('applies correct background color for ordered status', () => {
  const w = mountCard({ ...sampleAction, status: 'ordered' })
  expect(w.find('div').classes()).toContain('bg-sky-50')
})

test('applies correct background color for done status', () => {
  const w = mountCard({ ...sampleAction, status: 'done' })
  expect(w.find('div').classes()).toContain('bg-mint-50')
})

describe('dark mode (#416)', () => {
  // `blue` et `emerald` de la palette Tailwind par défaut ne basculent pas :
  // remplacés par `sky` et `mint`, inversés par `[data-theme='dark']`.
  const STATUS_TOKENS = [
    ['pending', 'bg-amber-50', 'border-amber-200'],
    ['ordered', 'bg-sky-50', 'border-sky-200'],
    ['done', 'bg-mint-50', 'border-mint-200'],
    ['cancelled', 'bg-surface-elevated', 'border-border'],
  ] as const

  test.each(STATUS_TOKENS)('le statut %s bascule via %s / %s', (status, bg, border) => {
    const classes = mountCard({ ...sampleAction, status })
      .find('div')
      .classes()
      .join(' ')
    expect(classes).toContain(bg)
    expect(classes).toContain(border)
  })

  test('aucun statut ne retombe sur la palette Tailwind par défaut', () => {
    for (const [status] of STATUS_TOKENS) {
      const html = mountCard({ ...sampleAction, status }).html()
      expect(html, status).not.toMatch(/-(blue|emerald|green|red|gray|slate)-\d/)
    }
  })
})
