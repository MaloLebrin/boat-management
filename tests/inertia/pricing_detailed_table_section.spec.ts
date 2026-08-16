import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'
import PricingDetailedTableSection from '../../inertia/components/marketing/pricing/PricingDetailedTableSection.vue'
import { formatPrice } from '../../shared/helpers/number_format'

const page = vi.hoisted(() => ({ locale: 'fr' }))

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return { ...actual, usePage: () => ({ props: { locale: page.locale } }) }
})

afterEach(() => {
  page.locale = 'fr'
})

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

  expect(w.text()).toContain(`${formatPrice(20, 'fr')} / mois`)
  expect(w.text()).toContain(`${formatPrice(99, 'fr')} / mois`)
  expect(w.text()).not.toContain('Facturé annuellement.')
})

test('annual billing shows the discounted plan prices with the billed-annually note', () => {
  const w = mount(PricingDetailedTableSection, { props: makeProps('annual') })

  expect(w.text()).toContain(`${formatPrice(16, 'fr')} / mois`)
  expect(w.text()).toContain(`${formatPrice(79, 'fr')} / mois`)
  expect(w.text()).toContain('Facturé annuellement.')
})

test('the free Starter plan keeps its static label regardless of billing', () => {
  const w = mount(PricingDetailedTableSection, { props: makeProps('annual') })

  expect(w.text()).toContain('Gratuit')
})

describe('dark mode (#416)', () => {
  test('le tableau bascule, seul le CTA sur bandeau navy reste blanc', () => {
    const html = mount(PricingDetailedTableSection, { props: makeProps('monthly') }).html()
    expect(html).toContain('bg-surface-elevated')
    // Le seul `bg-white` restant est le bouton du plan mis en avant, posé sur
    // un bandeau navy permanent — il doit rester clair dans les deux thèmes.
    expect(html.match(/bg-white(?![/\w-])/g) ?? []).toHaveLength(1)
  })
})
