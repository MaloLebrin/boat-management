import { mount } from '@vue/test-utils'
import { describe, test, expect, vi } from 'vitest'
import BudgetCategoryCard from '../../inertia/components/boats/budget/BudgetCategoryCard.vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}(${JSON.stringify(params)})` : key,
  }),
}))

vi.mock('~/composables/use_currency_format', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (v: number) => `${v.toFixed(2)} €`,
  }),
}))

function mountCard(overrides: Partial<InstanceType<typeof BudgetCategoryCard>['$props']> = {}) {
  return mount(BudgetCategoryCard, {
    props: {
      category: 'maintenance',
      amount: 0,
      previousAmount: null,
      previousYear: null,
      ...overrides,
    },
  })
}

test('renders the formatted amount', () => {
  const w = mountCard({ amount: 1500, previousAmount: null, previousYear: null })
  expect(w.text()).toContain('1500.00 €')
})

test('shows noComparison when previousAmount is null', () => {
  const w = mountCard({ amount: 100, previousAmount: null, previousYear: null })
  expect(w.text()).toContain('budget.cards.noComparison')
})

test('shows increase delta when amount grew vs previous year', () => {
  const w = mountCard({ amount: 1100, previousAmount: 1000, previousYear: 2023 })
  expect(w.text()).toContain('budget.cards.increase')
})

test('shows decrease delta when amount shrank vs previous year', () => {
  const w = mountCard({ amount: 800, previousAmount: 1000, previousYear: 2023 })
  expect(w.text()).toContain('budget.cards.decrease')
})

test('shows newThisYear when previous amount was 0 and current is positive', () => {
  const w = mountCard({ amount: 500, previousAmount: 0, previousYear: 2023 })
  expect(w.text()).toContain('budget.cards.newThisYear')
})

test('shows no delta when both years are zero', () => {
  const w = mountCard({ amount: 0, previousAmount: 0, previousYear: 2023 })
  expect(w.text()).not.toContain('budget.cards.increase')
  expect(w.text()).not.toContain('budget.cards.decrease')
  expect(w.text()).not.toContain('budget.cards.newThisYear')
})

test('shows vsLastYear label with previous year', () => {
  const w = mountCard({ amount: 100, previousAmount: 80, previousYear: 2023 })
  expect(w.text()).toContain('budget.cards.vsLastYear')
})

test('renders help icon with title when helpText is provided', () => {
  const w = mountCard({ helpText: 'Source: maintenance events' })
  const btn = w.find('button[title="Source: maintenance events"]')
  expect(btn.exists()).toBe(true)
})

test('does not render help icon when helpText is absent', () => {
  const w = mountCard({})
  expect(w.find('button[title]').exists()).toBe(false)
})

describe('dark mode (#416)', () => {
  // Les 6 catégories utilisaient la palette Tailwind par défaut
  // (blue/purple/teal/green/orange) doublée de classes `dark:`. Elles sont
  // passées aux palettes de marque, seules inversées par `[data-theme='dark']`.
  const CATEGORY_TOKENS = [
    ['maintenance', 'text-amber-700'],
    ['fuel', 'text-sky-800'],
    ['documents', 'text-violet-700'],
    ['port', 'text-lilac-800'],
    ['equipment', 'text-mint-700'],
    ['entries', 'text-peach-700'],
    ['total', 'text-fg'],
  ] as const

  test.each(CATEGORY_TOKENS)('la catégorie %s bascule via %s', (category, token) => {
    expect(mountCard({ category }).html()).toContain(token)
  })

  test('plus aucune classe dark: ni palette Tailwind par défaut', () => {
    for (const [category] of CATEGORY_TOKENS) {
      const html = mountCard({ category }).html()
      expect(html, category).not.toContain('dark:')
      expect(html, category).not.toMatch(/-(blue|purple|teal|green|orange|emerald|red)-\d/)
    }
  })

  test('le delta de comparaison utilise les tokens de statut', () => {
    const up = mountCard({ amount: 200, previousAmount: 100, previousYear: 2023 }).html()
    expect(up).toContain('text-danger')

    const down = mountCard({ amount: 50, previousAmount: 100, previousYear: 2023 }).html()
    expect(down).toContain('text-success')
  })
})
