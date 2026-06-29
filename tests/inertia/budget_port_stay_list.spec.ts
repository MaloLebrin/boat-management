import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import BudgetPortStayList from '../../inertia/components/boats/budget/BudgetPortStayList.vue'
import type { BoatPortStayItem } from '../../shared/types/budget'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('~/composables/use_currency_format', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (v: number) => `${v.toFixed(2)} €`,
  }),
}))

vi.mock('@inertiajs/vue3', () => ({
  router: { delete: vi.fn() },
  useForm: () => ({
    portName: '',
    startedAt: '',
    endedAt: '',
    cost: '',
    notes: '',
    errors: {},
    processing: false,
    patch: vi.fn(),
    reset: vi.fn(),
  }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: { template: '<button @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
}))

vi.mock('~/components/base/BaseInput.vue', () => ({
  default: { template: '<input />', props: ['modelValue', 'label', 'error', 'type', 'required'] },
}))

const stayWithEndDate: BoatPortStayItem = {
  id: 1,
  portName: 'Port de Marseille',
  startedAt: '2024-06-01',
  endedAt: '2024-06-15',
  cost: 250.5,
  notes: null,
}

const stayWithNullEndDate: BoatPortStayItem = {
  id: 2,
  portName: 'Mouillage Calanques',
  startedAt: '2024-07-10',
  endedAt: null,
  cost: null,
  notes: 'Beau mouillage',
}

function mountList(stays: BoatPortStayItem[] = [], canManage = true) {
  return mount(BudgetPortStayList, { props: { boatId: 1, stays, canManage } })
}

test('shows noStays message when list is empty', () => {
  const w = mountList([])
  expect(w.text()).toContain('budget.portStay.noStays')
})

test('renders port name', () => {
  const w = mountList([stayWithEndDate])
  expect(w.text()).toContain('Port de Marseille')
})

test('renders "—" when endedAt is null', () => {
  const w = mountList([stayWithNullEndDate])
  expect(w.text()).toContain('—')
})

test('renders "—" cost placeholder when cost is null', () => {
  const w = mountList([stayWithNullEndDate])
  const spans = w.findAll('span')
  const dashSpan = spans.find((s) => s.text() === '—')
  expect(dashSpan).toBeDefined()
})

test('renders formatted cost when provided', () => {
  const w = mountList([stayWithEndDate])
  expect(w.text()).toContain('250.50 €')
})

test('shows edit and delete buttons when canManage is true', () => {
  const w = mountList([stayWithEndDate], true)
  expect(w.text()).toContain('common.edit')
  expect(w.text()).toContain('common.delete')
})

test('does not show edit/delete buttons when canManage is false', () => {
  const w = mountList([stayWithEndDate], false)
  expect(w.text()).not.toContain('common.edit')
  expect(w.text()).not.toContain('common.delete')
})

test('renders notes when present', () => {
  const w = mountList([stayWithNullEndDate])
  expect(w.text()).toContain('Beau mouillage')
})
