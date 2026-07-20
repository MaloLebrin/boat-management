import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import PricingTiersSection from '../../inertia/components/marketing/pricing/PricingTiersSection.vue'

const tiers = [
  {
    name: 'Starter',
    tag: 'Free',
    price: 0,
    pricePer: '/ mois',
    sub: 'Pour démarrer',
    feats: [['A']] as Array<[string, string?]>,
    cta: 'Démarrer',
    ctaVariant: 'outline',
  },
  {
    name: 'Pro',
    tag: 'Populaire',
    price: 20,
    pricePer: '/ mois',
    priceAnnual: 16,
    priceAnnualPer: '/ mois',
    sub: 'Pour grandir',
    featured: true,
    feats: [['B']] as Array<[string, string?]>,
    cta: 'Essayer',
    ctaVariant: 'primary',
  },
]

function makeProps(billing: 'monthly' | 'annual') {
  return {
    tiers,
    billing,
    reassurance: [{ icon: '✓', label: 'Sans engagement' }],
    featuredBadgeLabel: 'Recommandé',
    billedAnnuallyNote: 'Facturé annuellement.',
  }
}

test('monthly billing shows the monthly price with no annual note', () => {
  const w = mount(PricingTiersSection, { props: makeProps('monthly') })

  expect(w.text()).toContain('20')
  expect(w.text()).not.toContain('Facturé annuellement.')
})

test('annual billing shows the discounted price with the billed-annually note', () => {
  const w = mount(PricingTiersSection, { props: makeProps('annual') })

  expect(w.text()).toContain('16')
  expect(w.text()).toContain('Facturé annuellement.')
})

test('a tier with no annual price (Starter) never shows the billed-annually note', () => {
  const w = mount(PricingTiersSection, { props: makeProps('annual') })
  const starterCard = w.findAll('.rounded-2xl')[0]

  expect(starterCard.text()).not.toContain('Facturé annuellement.')
})
