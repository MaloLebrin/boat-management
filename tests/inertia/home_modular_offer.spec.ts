import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'
import HomeModularOfferSection from '../../inertia/components/marketing/home/HomeModularOfferSection.vue'
import { formatPrice } from '../../shared/helpers/number_format'

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a><slot /></a>' },
}))

const page = vi.hoisted(() => ({ locale: 'fr' }))

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return { ...actual, usePage: () => ({ props: { locale: page.locale } }) }
})

afterEach(() => {
  page.locale = 'fr'
})

const baseProps = {
  eyebrow: 'OFFRE MODULAIRE',
  title: 'Un socle,',
  titleHighlight: 'vos modules.',
  subtitle: 'Sub',
  baseName: 'Plan Pro',
  baseDesc: 'Desc',
  basePrice: 20,
  pricePer: '/mois',
  modulesLabel: 'LE SOCLE',
  note: 'Modules disponibles sur le plan Pro.',
  ctaLabel: 'Composer mon offre',
  ctaHref: '/fr/tarifs',
  modules: [
    { icon: '📅', name: 'Location', desc: 'Desc', price: 15 },
    { icon: '🧾', name: 'CRM & Facturation', desc: 'Desc', price: 15 },
  ],
}

test('renders the base plan price and both modules with prices', () => {
  const w = mount(HomeModularOfferSection, { props: baseProps })
  expect(w.text()).toContain('Plan Pro')
  expect(w.text()).toContain(formatPrice(20, 'fr'))
  expect(w.text()).toContain('Location')
  expect(w.text()).toContain('CRM & Facturation')
  expect(w.text()).toContain(`+${formatPrice(15, 'fr')}`)
})

// #465 — le prix était écrit « {{ basePrice }} € » en dur, si bien que la page
// EN affichait « 20 € » à côté d'un texte annonçant « €20 ».
test('places the currency symbol on the side the locale expects', () => {
  const fr = mount(HomeModularOfferSection, { props: baseProps }).text()
  expect(fr).toContain(formatPrice(20, 'fr'))
  expect(fr).toMatch(/20\s?€/)

  page.locale = 'en'
  const en = mount(HomeModularOfferSection, { props: baseProps }).text()
  expect(en).toContain('€20')
  expect(en).not.toMatch(/20\s?€/)
})

test('renders the availability note and CTA', () => {
  const w = mount(HomeModularOfferSection, { props: baseProps })
  expect(w.text()).toContain('Modules disponibles sur le plan Pro.')
  expect(w.text()).toContain('Composer mon offre')
})

describe('dark mode (#416)', () => {
  test('les cartes de module basculent avec la surface', () => {
    const html = mount(HomeModularOfferSection, { props: baseProps }).html()
    expect(html).toContain('bg-surface-elevated')
    expect(html).not.toContain('bg-white')
  })
})
