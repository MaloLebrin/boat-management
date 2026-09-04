import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import type { FeaturePageProps, HelpPageProps } from '../../shared/types/marketing.js'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    Head: { template: '<div><slot /></div>' },
    usePage: () => ({ props: { locale: 'fr' } }),
  }
})

import MarketingFeature from '../../inertia/pages/marketing/feature.vue'
import MarketingHelp from '../../inertia/pages/marketing/help.vue'

const cta = (label: string) => ({ label, href: '/signup' })

const featureProps: FeaturePageProps = {
  featureKey: 'maintenance',
  t: {
    meta: { title: 'Carnet d’entretien', description: 'Desc' },
    hero: {
      eyebrow: 'Carnet',
      title: 'Toute la vie de tes bateaux,',
      titleHighlight: 'au même endroit',
      subtitle: 'Sous-titre',
      primaryCta: cta('Essayer'),
      secondaryCta: { label: 'Estimer', href: '/fr/simulateur-cout-entretien' },
      reassurance: 'Sans carte bancaire',
      mockType: 'boatDetail',
    },
    blocks: [1, 2, 3].map((n) => ({
      eyebrow: `Bloc ${n}`,
      title: `Titre ${n}`,
      titleHighlight: 'highlight',
      body: 'Body',
      bullets: ['a', 'b'],
      mockType: 'planning' as const,
    })),
    steps: {
      eyebrow: 'Comment ça marche',
      title: 'Trois étapes',
      subtitle: 'Sub',
      items: [
        { step: '1', title: 'Un', description: 'D1' },
        { step: '2', title: 'Deux', description: 'D2' },
        { step: '3', title: 'Trois', description: 'D3' },
      ],
    },
    proof: {
      stats: [
        { value: '10 min', label: 'setup' },
        { value: '0', label: 'oubli' },
        { value: '1 clic', label: 'facture' },
      ],
      quote: { text: 'Citation', author: 'Julien', role: 'Loueur' },
    },
    crossLinks: {
      eyebrow: 'Aller plus loin',
      title: 'FleetAi ne s’arrête pas là',
      linkLabel: 'Découvrir',
      items: [{ title: 'Flotte', description: 'Desc', href: '/fr/gestion-flotte-bateaux' }],
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Questions',
      titleHighlight: 'fréquentes',
      items: [{ q: 'Q1', a: 'A1' }],
    },
    finalCta: {
      title: 'Arrête de courir',
      titleHighlight: 'après les dates.',
      subtitle: 'Sub',
      primaryCta: cta('Créer mon compte'),
      secondaryCta: { label: 'Voir les tarifs', href: '/fr/tarifs' },
    },
  },
}

test('feature.vue rend le hero, les blocs et le maillage interne', () => {
  const w = mount(MarketingFeature, { props: featureProps })

  expect(w.text()).toContain('Toute la vie de tes bateaux,')
  expect(w.text()).toContain('Titre 1')
  expect(w.text()).toContain('Titre 3')
  expect(w.findAll('a[href="/fr/gestion-flotte-bateaux"]').length).toBe(1)
  expect(w.findAll('a[href="/fr/simulateur-cout-entretien"]').length).toBe(1)
})

const helpProps: HelpPageProps = {
  t: {
    meta: { title: 'Aide & support', description: 'Desc' },
    hero: {
      eyebrow: 'Aide',
      title: 'Besoin d’un',
      titleHighlight: 'coup de main ?',
      subtitle: 'Sub',
    },
    channels: [
      {
        title: 'Écris au support',
        description: 'Desc',
        ctaLabel: 'support@fleetai.app',
        href: 'mailto:support@fleetai.app',
        external: true,
      },
      {
        title: 'Formulaire',
        description: 'Desc',
        ctaLabel: 'Ouvrir',
        href: '/fr/contact#contact-form',
      },
      {
        title: 'Démo',
        description: 'Desc',
        ctaLabel: 'Réserver',
        href: '/fr/contact#contact-form',
      },
    ],
    faq: {
      eyebrow: 'FAQ',
      title: 'Les réponses',
      titleHighlight: 'aux questions',
      groups: [
        { title: 'Bien démarrer', items: [{ q: 'Q1', a: 'A1' }] },
        { title: 'Tarifs', items: [{ q: 'Q2', a: 'A2' }] },
      ],
    },
    resources: {
      eyebrow: 'Ressources',
      title: 'Avance en autonomie',
      subtitle: 'Sub',
      linkLabel: 'Découvrir',
      items: [{ title: 'Guide', description: 'Desc', href: '/fr/cout-entretien-bateau' }],
    },
    finalCta: {
      title: 'Toujours bloqué ?',
      titleHighlight: 'On est là.',
      subtitle: 'Sub',
      primaryCta: { label: 'Contacter', href: '/fr/contact#contact-form' },
      secondaryCta: { label: 'Créer un compte', href: '/signup' },
    },
  },
}

test('help.vue rend les canaux (mailto en ancre brute) et la FAQ groupée', async () => {
  const w = mount(MarketingHelp, { props: helpProps })

  expect(w.text()).toContain('coup de main ?')
  // Le canal support est une vraie ancre mailto, pas un <Link> Inertia.
  expect(w.findAll('a[href="mailto:support@fleetai.app"]').length).toBe(1)
  expect(w.text()).toContain('Bien démarrer')

  // L'accordéon ouvre la réponse au clic (le JSON-LD du <Head> contient déjà
  // le texte, on cible donc le <dd> rendu, pas le texte global).
  expect(w.find('dd').exists()).toBe(false)
  await w.find('button[aria-expanded="false"]').trigger('click')
  expect(w.find('dd').text()).toContain('A1')
})

test('help.vue relie les ressources self-service', () => {
  const w = mount(MarketingHelp, { props: helpProps })
  expect(w.findAll('a[href="/fr/cout-entretien-bateau"]').length).toBe(1)
})
