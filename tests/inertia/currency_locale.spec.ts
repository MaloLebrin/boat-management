import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

/**
 * Les montants suivent la locale de l'app, jamais celle du navigateur ni un
 * `fr-FR` codé en dur (#461 pour la monnaie) :
 * - les composants de facturation formataient avec `Intl.NumberFormat(undefined)`
 *   → la locale du navigateur, donc `€1,200.00` dans une session française ;
 * - les budgets et le simulateur passaient par `use_currency_format` (fr-FR)
 *   → `1 234,50 €` dans une session anglaise.
 */
const mockLocale = vi.hoisted(() => ({ value: 'en' }))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: mockLocale.value } }),
}))

import InvoiceTotalsPreview from '../../inertia/components/invoices/InvoiceTotalsPreview.vue'
import BudgetCategoryCard from '../../inertia/components/boats/budget/BudgetCategoryCard.vue'
import SimulatorResultCard from '../../inertia/components/marketing/simulator/SimulatorResultCard.vue'

const ICU_SPACES = new RegExp('[\\u00a0\\u202f]', 'g')
const plain = (value: string) => value.replace(ICU_SPACES, ' ')

describe('currency follows the app locale', () => {
  test('invoice totals render French amounts in a French session', () => {
    mockLocale.value = 'fr'
    const wrapper = mount(InvoiceTotalsPreview, {
      props: { subtotal: 1000, taxAmount: 200, total: 1200, taxRate: '20', currency: 'EUR' },
    })

    expect(plain(wrapper.text())).toContain('1 200,00 €')
    expect(plain(wrapper.text())).not.toContain('€1,200.00')
  })

  test('budget cards render English amounts in an English session', () => {
    mockLocale.value = 'en'
    const wrapper = mount(BudgetCategoryCard, {
      props: { category: 'total', amount: 1234.5, previousAmount: null, previousYear: null },
    })

    expect(plain(wrapper.text())).toContain('€1,234.50')
    expect(plain(wrapper.text())).not.toContain('1 234,50 €')
  })

  test('the simulator result renders whole euros in the English format', () => {
    mockLocale.value = 'en'
    const wrapper = mount(SimulatorResultCard, {
      props: {
        breakdown: {
          totalMin: 1200,
          totalMax: 3400,
          categories: [{ key: 'hull', minCost: 500, maxCost: 900 }],
        },
        input: {
          boatType: 'sailboat',
          lengthM: 10,
          yearBuilt: 2005,
          navigationCategory: 'B',
          hasDedicatedEngine: false,
          hullWear: 'good',
          engineWear: null,
          safetyWear: 'good',
          riggingWear: 'good',
        },
      },
      global: { stubs: { BaseButton: { template: '<button><slot /></button>' } } },
    })

    expect(plain(wrapper.text())).toContain('€1,200')
    expect(plain(wrapper.text())).not.toContain('1 200 €')
  })
})
