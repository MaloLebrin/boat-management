import { mount } from '@vue/test-utils'
import { describe, test, expect, vi } from 'vitest'
import BudgetEntryList from '../../inertia/components/boats/budget/BudgetEntryList.vue'
import type { BoatBudgetEntryItem } from '../../shared/types/budget'

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
    label: '',
    amount: '',
    date: '',
    category: '',
    description: '',
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

vi.mock('~/components/base/BaseSelect.vue', () => ({
  default: { template: '<select />', props: ['modelValue', 'label', 'options', 'error'] },
}))

const sampleEntry: BoatBudgetEntryItem = {
  id: 1,
  label: 'Taxe de francisation',
  amount: 1250,
  date: '2024-03-15',
  category: 'documents',
  description: null,
}

function mountList(entries: BoatBudgetEntryItem[] = [], canManage = true) {
  return mount(BudgetEntryList, {
    props: { boatId: 1, entries, canManage },
  })
}

test('shows noEntries message when list is empty', () => {
  const w = mountList([])
  expect(w.text()).toContain('budget.entries.noEntries')
})

test('renders entry label and formatted amount', () => {
  const w = mountList([sampleEntry])
  expect(w.text()).toContain('Taxe de francisation')
  expect(w.text()).toContain('1250.00 €')
})

test('renders category badge', () => {
  const w = mountList([sampleEntry])
  expect(w.text()).toContain('budget.entries.categories.documents')
})

test('does not show edit/delete buttons when canManage is false', () => {
  const w = mountList([sampleEntry], false)
  expect(w.text()).not.toContain('common.delete')
  expect(w.text()).not.toContain('common.edit')
})

test('shows edit and delete buttons when canManage is true', () => {
  const w = mountList([sampleEntry], true)
  expect(w.text()).toContain('common.delete')
  expect(w.text()).toContain('common.edit')
})

describe('dark mode (#416)', () => {
  const CATEGORY_TOKENS = [
    ['maintenance', 'bg-amber-100'],
    ['fuel', 'bg-sky-100'],
    ['documents', 'bg-violet-100'],
    ['port', 'bg-lilac-100'],
    ['equipment', 'bg-mint-100'],
    ['other', 'bg-surface-muted'],
  ] as const

  test.each(CATEGORY_TOKENS)('la pastille %s bascule via %s', (category, token) => {
    const html = mountList([{ ...sampleEntry, category }]).html()
    expect(html).toContain(token)
  })

  test('plus aucune classe dark: dans la liste', () => {
    // Les `dark:` d'origine s'activaient sur `prefers-color-scheme` alors que
    // le fond restait crème : ils étaient faux avant même cette PR.
    expect(mountList([sampleEntry]).html()).not.toContain('dark:')
  })
})
