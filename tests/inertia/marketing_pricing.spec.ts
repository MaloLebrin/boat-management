import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
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
        meta: { title: 'Tarifs', description: 'Desc' },
        pricing: {
          hero: {
            eyebrowLabel: 'Tarifs',
            title: 'Tarifs',
            titleHighlight: 'simples',
            subtitle: 'Des plans simples.',
            monthlyLabel: 'Mensuel',
            annualLabel: 'Annuel',
            annualBadge: '-20%',
          },
          tiers: [
            {
              name: 'Starter',
              tag: '',
              price: 0,
              sub: 'Gratuit',
              feats: [['A']],
              cta: 'Démarrer',
              ctaVariant: 'outline',
            },
            {
              name: 'Pro',
              tag: 'Popular',
              price: 29,
              sub: '/mois',
              featured: true,
              feats: [['B']],
              cta: 'Essayer',
              ctaVariant: 'primary',
            },
            {
              name: 'Enterprise',
              tag: '',
              price: 'Sur devis',
              sub: '',
              feats: [['C']],
              cta: 'Contact',
              ctaVariant: 'outline',
            },
          ],
          reassurance: [{ icon: '✓', label: 'Sans engagement' }],
          roi: {
            eyebrow: 'ROI',
            title: 'Retour',
            titleHighlight: 'investissement',
            subtitle: 'Sub',
            profileLabel: 'Profil',
            boatsLabel: 'Bateaux',
            hourlyLabel: '€/h',
            studyNote: 'Note',
            savingsLabel: 'Économies',
            perMonthLabel: '/mois',
            timeLabel: 'Temps',
            maintLabel: 'Maintenance',
            fleetideLabel: 'FleetAi',
            fleetCostLabel: 'Coût',
            roiLabel: 'ROI',
            ctaLabel: 'Démarrer',
            profiles: {
              loueurs: { label: 'Loueurs', emoji: '🚤' },
              ecoles: { label: 'Écoles', emoji: '🎓' },
              marinas: { label: 'Marinas', emoji: '⚓' },
              armateurs: { label: 'Armateurs', emoji: '🛳️' },
            },
          },
          testimonials: {
            eyebrow: 'Témoignages',
            title: 'Ils nous font confiance',
            titleHighlight: 'confiance',
            items: [
              {
                stat: '30%',
                statLabel: 'gain',
                quote: 'Q',
                name: 'N',
                org: 'O',
                role: 'R',
                plan: 'Pro',
              },
            ],
          },
          configurator: {
            eyebrow: 'Config',
            title: 'Composez',
            titleHighlight: 'votre offre',
            subtitle: 'Sub',
            baseName: 'Socle Pro',
            baseDesc: 'Desc',
            basePriceMonthly: 20,
            basePriceAnnual: 16,
            modulesLabel: 'Modules',
            perMonth: '/mois',
            perYear: '/an',
            totalLabel: 'Total',
            annualSaveLabel: 'Économie',
            billedAnnuallyNote: 'Facturé annuellement.',
            ctaLabel: 'Commencer',
            ctaHref: '/signup',
            modules: [
              {
                key: 'charter',
                icon: '📅',
                name: 'Location',
                desc: 'Desc',
                priceMonthly: 15,
                priceAnnual: 12,
                features: ['A', 'B'],
              },
            ],
            enterprise: {
              name: 'Entreprise',
              priceMonthly: 99,
              priceAnnual: 79,
              note: 'Note',
              ctaLabel: 'Voir',
            },
          },
          detailedTable: {
            eyebrow: 'Comparaison',
            title: 'Tout inclus',
            titleHighlight: 'inclus',
            subtitle: 'Sub',
            expandAll: 'Tout ouvrir',
            collapseAll: 'Tout fermer',
            addonLabel: 'Add-on',
            groups: [{ title: 'G1', rows: [['Feature', true, false, true]] }],
            planHeaders: [
              { name: 'Starter', price: 'Gratuit', cta: 'Démarrer' },
              { name: 'Pro', price: '29€', cta: 'Essayer' },
              { name: 'Enterprise', price: 'Sur devis', cta: 'Contact' },
            ],
          },
          extras: {
            eyebrow: 'Extras',
            title: 'Plus',
            subtitle: 'Sub',
            items: [
              {
                icon: '⚙️',
                title: 'E1',
                sub: 'Sub',
                price: '10€',
                priceSub: '/mois',
                tone: 'blue',
              },
            ],
          },
          modules: {
            eyebrow: 'Modules',
            title: 'Modules add-ons',
            subtitle: 'Sub',
            note: 'Disponibles sur Pro.',
            pricePer: '/mois',
            includedLabel: 'Inclus dans Entreprise.',
            items: [{ icon: '📅', name: 'Location', desc: 'Desc', price: 15 }],
          },
          faq: {
            eyebrow: 'FAQ',
            title: 'Questions',
            titleHighlight: 'Questions',
            subtitle: 'Sub',
            ctaLabel: 'Contact',
            items: [{ q: 'Q1', a: 'A1' }],
          },
          finalCta: {
            title: 'Final',
            titleHighlight: 'Final',
            subtitle: 'Sub',
            primaryCta: 'Démarrer',
            secondaryCta: 'Retour accueil',
          },
        },
      },
    },
  })
  expect(w.text()).toContain('Tarifs')
})
