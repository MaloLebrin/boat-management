import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import HomeModularOfferSection from '../../inertia/components/marketing/home/HomeModularOfferSection.vue'

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a><slot /></a>' },
}))

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
  expect(w.text()).toContain('20 €')
  expect(w.text()).toContain('Location')
  expect(w.text()).toContain('CRM & Facturation')
  expect(w.text()).toContain('+15 €')
})

test('renders the availability note and CTA', () => {
  const w = mount(HomeModularOfferSection, { props: baseProps })
  expect(w.text()).toContain('Modules disponibles sur le plan Pro.')
  expect(w.text()).toContain('Composer mon offre')
})
