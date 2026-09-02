import { mount } from '@vue/test-utils'
import { afterEach, expect, test, vi } from 'vitest'
import PricingTiersSection from '../../inertia/components/marketing/pricing/PricingTiersSection.vue'
import { formatPrice } from '../../shared/helpers/number_format'

const page = vi.hoisted(() => ({ locale: 'fr' }))

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return { ...actual, usePage: () => ({ props: { locale: page.locale } }) }
})

afterEach(() => {
  page.locale = 'fr'
})

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
    freeLabel: 'Gratuit',
  }
}

test('monthly billing shows the monthly price with no annual note', () => {
  const w = mount(PricingTiersSection, { props: makeProps('monthly') })

  expect(w.text()).toContain(formatPrice(20, 'fr'))
  expect(w.text()).not.toContain('Facturé annuellement.')
})

test('annual billing shows the discounted price with the billed-annually note', () => {
  const w = mount(PricingTiersSection, { props: makeProps('annual') })

  expect(w.text()).toContain(formatPrice(16, 'fr'))
  expect(w.text()).toContain('Facturé annuellement.')
})

test('a tier with no annual price (Starter) never shows the billed-annually note', () => {
  const w = mount(PricingTiersSection, { props: makeProps('annual') })
  const starterCard = w.findAll('.rounded-2xl')[0]

  expect(starterCard.text()).not.toContain('Facturé annuellement.')
})

// #612 — la carte rendait le nombre nu (« 20 / mois ») alors que le comparatif,
// deux sections plus bas sur la même page, rendait « 20 € / mois ».
test('prices carry the currency symbol, placed by the locale', () => {
  const fr = mount(PricingTiersSection, { props: makeProps('monthly') })
  expect(fr.text()).toContain(formatPrice(20, 'fr'))
  expect(formatPrice(20, 'fr')).toContain('€')

  page.locale = 'en'
  const en = mount(PricingTiersSection, { props: makeProps('monthly') })
  expect(en.text()).toContain(formatPrice(20, 'en'))
})

test('a free tier reads its label, never a formatted zero', () => {
  for (const billing of ['monthly', 'annual'] as const) {
    const w = mount(PricingTiersSection, { props: makeProps(billing) })
    const starterCard = w.findAll('.rounded-2xl')[0]

    expect(starterCard.text()).toContain('Gratuit')
    expect(starterCard.text()).not.toContain(formatPrice(0, 'fr'))
    // Pas de suffixe « / mois » accroché à un prix nul.
    expect(starterCard.text()).not.toContain('/ mois')
  }
})
