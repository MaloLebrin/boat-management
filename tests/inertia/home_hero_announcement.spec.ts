import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import HomeHeroSection from '../../inertia/components/marketing/home/HomeHeroSection.vue'

vi.mock('@inertiajs/vue3', () => ({
  useForm: () => ({ processing: false, post: vi.fn() }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    name: 'MockInertiaLink',
    props: { href: { type: String, required: false } },
    template: '<a data-link :href="href"><slot /></a>',
  },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :disabled="disabled"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled', 'href', 'route'],
  },
}))

const heroContent = {
  title: 'Tu gères ta flotte dans Excel.',
  titleHighlight: 'Tu peux faire mieux.',
  subtitle: 'Carnet d’entretien, planning, assistant IA.',
}

const baseProps = {
  activePersona: 'loueurs' as const,
  heroContent: {
    loueurs: heroContent,
    ecoles: heroContent,
    marinas: heroContent,
    armateurs: heroContent,
  },
  cta: { primary: 'Commencer gratuitement', secondary: 'Essayer la démo' },
  caption: 'Sans carte bleue',
  socialProof: { eyebrow: 'ILS NOUS FONT CONFIANCE', logos: ['Marina Bleue'] },
  locale: 'fr' as const,
  demoLoginPath: '/demo',
}

const stubs = { GradientMeshCanvas: true, HomeBrowserFrame: true, HomeMockDashboard: true }

/**
 * Badge du hero : lien interne vers le chat public de diagnostic depuis
 * l'emplacement le plus fort de la home (promotion SEO/conversion). Rendu en
 * `<Link>` Inertia, placé avant le H1, absent quand la home n'en fournit pas.
 */
test('le badge rend le libellé dans un Link Inertia placé avant le H1', () => {
  const announcement = {
    label: 'Nouveau · Diagnostic de panne IA gratuit',
    href: '/fr/diagnostic-panne-ia',
  }
  const w = mount(HomeHeroSection, { props: { ...baseProps, announcement }, global: { stubs } })

  const badge = w.get('a[data-link][href="/fr/diagnostic-panne-ia"]')
  expect(badge.text()).toContain(announcement.label)

  const html = w.html()
  expect(html.indexOf(announcement.label)).toBeLessThan(html.indexOf('<h1'))
  // Le H1 reste l'accroche du hero : le badge ne le remplace pas.
  expect(w.get('h1').text()).toContain(heroContent.title)
})

test('sans annonce, aucun badge et aucun lien vers le diagnostic', () => {
  const w = mount(HomeHeroSection, { props: baseProps, global: { stubs } })

  expect(w.findAll('a[href="/fr/diagnostic-panne-ia"]')).toHaveLength(0)
})
