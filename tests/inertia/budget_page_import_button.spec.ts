import { describe, expect, test, vi } from 'vitest'
import { mountWithStubs } from './helpers/mount'
import BudgetPage from '../../inertia/pages/boats/budget.vue'
import type { BudgetData } from '../../shared/types/budget'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})
vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))
vi.mock('~/composables/use_number_format', () => ({
  useNumberFormat: () => ({ formatCurrency: (n: number) => `${n} €` }),
}))

const stub = (name: string) => ({ name, template: `<div data-stub="${name}" />` })
const budgetStubs = {
  BudgetBarChart: stub('BudgetBarChart'),
  BudgetCategoryCard: stub('BudgetCategoryCard'),
  BudgetPortStayForm: stub('BudgetPortStayForm'),
  BudgetPortStayList: stub('BudgetPortStayList'),
  BudgetEntryForm: stub('BudgetEntryForm'),
  BudgetEntryList: stub('BudgetEntryList'),
  BaseBreadcrumb: stub('BaseBreadcrumb'),
}

const totals = {
  maintenance: 0,
  fuel: 0,
  documents: 0,
  port: 0,
  equipment: 0,
  entries: 0,
  total: 0,
}
const budget: BudgetData = {
  year: 2026,
  monthly: [],
  totals,
  previousYearTotals: null,
}

function mountPage(canImport: boolean) {
  return mountWithStubs(BudgetPage, {
    stubs: budgetStubs,
    props: {
      boat: { id: 7, name: 'Ariane' },
      budget,
      year: 2026,
      portStays: [],
      entries: [],
      canManage: true,
      canImport,
      portOptions: [],
    },
  })
}

/**
 * Le raccourci « Importer des dépenses » mène à `/settings/import`
 * présélectionné sur le bateau et le type ; il n'apparaît que si l'import est
 * réellement ouvert (plan Entreprise + admin), comme le calcule le contrôleur.
 */
describe('Budget — bouton d’import de dépenses', () => {
  test('présent avec canImport, lien interne présélectionné', () => {
    const w = mountPage(true)
    const button = w
      .findAllComponents({ name: 'BaseButton' })
      .find((c) => c.text().includes('budget.importButton'))

    expect(button).toBeDefined()
    expect(button!.props('href')).toBe('/settings/import?type=expenses&boatId=7')
    expect(button!.props('externalHref')).toBeFalsy()
  })

  test('absent sans canImport, l’export reste', () => {
    const w = mountPage(false)

    expect(w.text()).not.toContain('budget.importButton')
    expect(w.text()).toContain('budget.exportCsv')
  })
})
