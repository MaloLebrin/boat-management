import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import PricingDetailedTableSection from '../../inertia/components/marketing/pricing/PricingDetailedTableSection.vue'

function makeProps(billing: 'monthly' | 'annual') {
  return {
    eyebrow: 'COMPARATIF',
    title: 'Comparer les plans,',
    titleHighlight: 'ligne par ligne.',
    subtitle: 'Sub',
    expandAll: 'Tout déplier',
    collapseAll: 'Tout replier',
    addonLabel: 'Add-on',
    billing,
    billedAnnuallyNote: 'Facturé annuellement.',
    groups: [
      {
        title: 'G1',
        rows: [['Feature', true, false, true] as [string, boolean, boolean, boolean]],
      },
    ],
    planHeaders: [
      { name: 'Starter', price: 'Gratuit', cta: 'Démarrer' },
      { name: 'Pro', priceMonthly: 20, priceAnnual: 16, pricePer: '/ mois', cta: 'Essayer' },
      { name: 'Enterprise', priceMonthly: 99, priceAnnual: 79, pricePer: '/ mois', cta: 'Contact' },
    ],
  }
}

test('monthly billing shows the monthly plan prices with no annual note', () => {
  const w = mount(PricingDetailedTableSection, { props: makeProps('monthly') })

  expect(w.text()).toContain('20 € / mois')
  expect(w.text()).toContain('99 € / mois')
  expect(w.text()).not.toContain('Facturé annuellement.')
})

test('annual billing shows the discounted plan prices with the billed-annually note', () => {
  const w = mount(PricingDetailedTableSection, { props: makeProps('annual') })

  expect(w.text()).toContain('16 € / mois')
  expect(w.text()).toContain('79 € / mois')
  expect(w.text()).toContain('Facturé annuellement.')
})

test('the free Starter plan keeps its static label regardless of billing', () => {
  const w = mount(PricingDetailedTableSection, { props: makeProps('annual') })

  expect(w.text()).toContain('Gratuit')
})
