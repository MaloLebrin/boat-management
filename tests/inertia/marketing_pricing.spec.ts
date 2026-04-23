import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import MarketingPricing from '../../inertia/pages/marketing/pricing.vue'

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    Head: { template: '<div><slot /></div>' },
    Link: { template: '<a><slot /></a>' },
    usePage: () => ({ props: { locale: 'fr' } }),
  }
})

test('renders pricing title (fr)', () => {
  const w = mount(MarketingPricing, {
    props: {
      t: {
        brand: { name: 'Fleetide AI' },
        nav: { login: 'Connexion', signup: 'Inscription' },
        meta: { title: 'Tarifs', description: 'Desc' },
        pricing: {
          title: 'Tarifs',
          subtitle: 'Des plans simples.',
          note: 'Note',
          plans: {
            starter: { name: 'Starter', price: 'Gratuit', badge: 'Démarrer', features: ['A'] },
            pro: { name: 'Pro', price: '29€', badge: 'Le plus choisi', features: ['B'] },
            enterprise: {
              name: 'Enterprise',
              price: 'Sur devis',
              badge: 'Avancé',
              features: ['C'],
            },
          },
          compare: { title: 'Inclus', items: ['I1', 'I2', 'I3', 'I4', 'I5', 'I6'] },
          faq: {
            title: 'FAQ tarifs',
            items: [
              { q: 'Q1', a: 'A1' },
              { q: 'Q2', a: 'A2' },
              { q: 'Q3', a: 'A3' },
            ],
          },
          cta: { title: 'CTA', subtitle: 'Sub', primary: 'Démarrer', secondary: 'Retour accueil' },
        },
      },
    },
  })
  expect(w.text()).toContain('Tarifs')
})
