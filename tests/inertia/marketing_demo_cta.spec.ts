import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import HomeHeroSection from '../../inertia/components/marketing/home/HomeHeroSection.vue'
import HomeFinalCtaSection from '../../inertia/components/marketing/home/HomeFinalCtaSection.vue'
import HelpChannelsSection from '../../inertia/components/marketing/help/HelpChannelsSection.vue'

/**
 * CTA « Essayer la démo » : on ne réserve pas de démo — le CTA secondaire lance
 * la session de démo autonome via un POST Inertia sur `/demo` (CSRF automatique),
 * et retombe sur un lien classique quand aucune route de démo n'est fournie.
 */

const mockFormPost = vi.hoisted(() => vi.fn())
const mockForm = vi.hoisted(() => ({
  processing: false,
  post: mockFormPost,
}))

vi.mock('@inertiajs/vue3', () => ({
  useForm: () => mockForm,
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
    template:
      '<button :type="type" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled', 'href', 'route'],
  },
}))

const heroContent = {
  title: 'Ta flotte,',
  titleHighlight: 'pilotée.',
  subtitle: 'Maintenance et alertes en un seul endroit.',
}

const heroProps = {
  activePersona: 'loueurs' as const,
  heroContent: {
    loueurs: heroContent,
    ecoles: heroContent,
    marinas: heroContent,
    armateurs: heroContent,
  },
  cta: { primary: 'Créer mon organisation', secondary: 'Essayer la démo' },
  caption: 'Sans carte bleue',
  socialProof: { eyebrow: 'ILS NOUS FONT CONFIANCE', logos: ['Marina Bleue'] },
  locale: 'fr' as const,
}

const heroStubs = {
  GradientMeshCanvas: true,
  HomeBrowserFrame: true,
  HomeMockDashboard: true,
}

const finalCtaProps = {
  title: 'Reprends le contrôle de',
  titleHighlight: 'ta flotte.',
  subtitle: 'Plan Starter gratuit.',
  primaryCta: 'Créer mon organisation',
  secondaryCta: 'Essayer la démo',
}

function findByText(wrapper: ReturnType<typeof mount>, selector: string, text: string) {
  return wrapper.findAll(selector).find((node) => node.text().includes(text))
}

beforeEach(() => {
  vi.clearAllMocks()
  mockForm.processing = false
})

describe('HomeHeroSection — CTA secondaire', () => {
  test('lance la démo autonome en POST quand demoLoginPath est fourni', async () => {
    const wrapper = mount(HomeHeroSection, {
      props: { ...heroProps, demoLoginPath: '/demo' },
      global: { stubs: heroStubs },
    })

    const button = findByText(wrapper, 'button', 'Essayer la démo')
    expect(button).toBeDefined()
    await button!.trigger('click')

    expect(mockFormPost).toHaveBeenCalledWith('/demo')
  })

  test('reste un lien quand seul secondaryHref est fourni', () => {
    const wrapper = mount(HomeHeroSection, {
      props: { ...heroProps, secondaryHref: '/fr/contact#contact-form' },
      global: { stubs: heroStubs },
    })

    expect(wrapper.find('[data-link][href="/fr/contact#contact-form"]').exists()).toBe(true)
    expect(mockFormPost).not.toHaveBeenCalled()
  })
})

describe('HomeFinalCtaSection — CTA secondaire', () => {
  test('lance la démo autonome en POST quand demoLoginPath est fourni', async () => {
    const wrapper = mount(HomeFinalCtaSection, {
      props: { ...finalCtaProps, demoLoginPath: '/demo' },
      global: { stubs: { ParticleNetworkCanvas: true } },
    })

    const button = findByText(wrapper, 'button', 'Essayer la démo')
    expect(button).toBeDefined()
    await button!.trigger('click')

    expect(mockFormPost).toHaveBeenCalledWith('/demo')
  })

  test('reste un lien quand seul secondaryHref est fourni', () => {
    const wrapper = mount(HomeFinalCtaSection, {
      props: { ...finalCtaProps, secondaryHref: '/fr/contact#contact-form' },
      global: { stubs: { ParticleNetworkCanvas: true } },
    })

    expect(wrapper.find('[data-link][href="/fr/contact#contact-form"]').exists()).toBe(true)
    expect(mockFormPost).not.toHaveBeenCalled()
  })
})

describe('HelpChannelsSection — carte démo', () => {
  const items = [
    {
      title: 'Écris au support',
      description: 'Réponse sous 4 h.',
      ctaLabel: 'support@fleetai.app',
      href: 'mailto:support@fleetai.app',
      external: true,
    },
    {
      title: 'Envoie un message',
      description: 'Via le formulaire de contact.',
      ctaLabel: 'Ouvrir le formulaire',
      href: '/fr/contact#contact-form',
    },
    {
      title: 'Essaie la démo',
      description: 'Flotte de démo, sans inscription.',
      ctaLabel: 'Lancer la démo',
      href: '/demo',
      demo: true,
    },
  ]

  test('la carte démo est un bouton qui lance la session autonome', async () => {
    const wrapper = mount(HelpChannelsSection, { props: { items } })

    const button = findByText(wrapper, 'button', 'Lancer la démo')
    expect(button).toBeDefined()
    expect(button!.attributes('type')).toBe('button')
    await button!.trigger('click')

    expect(mockFormPost).toHaveBeenCalledWith('/demo')
  })

  test('les autres cartes restent des liens (mailto et <Link> Inertia)', () => {
    const wrapper = mount(HelpChannelsSection, { props: { items } })

    expect(wrapper.find('a[href="mailto:support@fleetai.app"]').exists()).toBe(true)
    expect(wrapper.find('[data-link][href="/fr/contact#contact-form"]').exists()).toBe(true)
  })
})
