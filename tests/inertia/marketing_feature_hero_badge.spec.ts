import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return { ...actual, usePage: () => ({ props: { locale: 'fr' } }) }
})

import FeatureHeroSection from '../../inertia/components/marketing/features/FeatureHeroSection.vue'

const baseProps = {
  eyebrow: 'Instruments de bord connectés',
  title: 'Tes instruments de bord,',
  titleHighlight: 'interprétés à bord.',
  subtitle: 'Sous-titre',
  primaryCta: { label: 'Essayer', href: '/signup?from=instruments' },
  secondaryCta: { label: 'Voir le plan Pro', href: '/fr/tarifs' },
  reassurance: 'Bientôt dans les plans Pro et Entreprise',
  mockType: 'instruments' as const,
}

test('FeatureHeroSection affiche la pastille quand `badge` est fourni', () => {
  const wrapper = mount(FeatureHeroSection, {
    props: { ...baseProps, badge: 'Bientôt disponible' },
  })

  const badge = wrapper.get('[data-testid="feature-hero-badge"]')
  expect(badge.text()).toBe('Bientôt disponible')
  // La pastille précède le titre : c'est la première chose lue après l'accroche.
  expect(wrapper.find('h1').element.compareDocumentPosition(badge.element)).toBe(
    Node.DOCUMENT_POSITION_PRECEDING
  )
})

test('FeatureHeroSection ne rend aucune pastille sans `badge`', () => {
  const wrapper = mount(FeatureHeroSection, { props: baseProps })

  expect(wrapper.find('[data-testid="feature-hero-badge"]').exists()).toBe(false)
  expect(wrapper.text()).toContain('Tes instruments de bord,')
})
