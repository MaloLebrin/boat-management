import { mount } from '@vue/test-utils'
import { afterEach, expect, test, vi } from 'vitest'
import PricingModulesSection from '../../inertia/components/marketing/pricing/PricingModulesSection.vue'
import { formatPrice } from '../../shared/helpers/number_format'

const page = vi.hoisted(() => ({ locale: 'fr' }))

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return { ...actual, usePage: () => ({ props: { locale: page.locale } }) }
})

afterEach(() => {
  page.locale = 'fr'
})

const baseProps = {
  eyebrow: 'MODULES',
  title: 'Modules add-ons',
  subtitle: 'Ne payez que ce que vous utilisez',
  note: 'Disponibles sur le plan Pro.',
  pricePer: '/mois',
  includedLabel: 'Inclus dans Entreprise.',
  items: [
    { icon: '📅', name: 'Location', desc: 'Tarif par bateau', price: 15 },
    { icon: '🧾', name: 'CRM & Facturation', desc: 'Clients et factures', price: 15 },
  ],
}

test('renders one card per module with its price', () => {
  const w = mount(PricingModulesSection, { props: baseProps })

  expect(w.text()).toContain('Location')
  expect(w.text()).toContain('CRM & Facturation')
  expect(w.text()).toContain(formatPrice(15, 'fr'))
  expect(w.text()).toContain('/mois')
})

test('renders the header and the availability note', () => {
  const w = mount(PricingModulesSection, { props: baseProps })

  expect(w.text()).toContain('Modules add-ons')
  expect(w.text()).toContain('Disponibles sur le plan Pro.')
  expect(w.text()).toContain('Inclus dans Entreprise.')
})
