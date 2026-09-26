import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import type { MouillageRow, PontoonRow, SpotRow } from '../../inertia/types/port'
import type { DashboardStats } from '../../shared/types/dashboard'

/**
 * CSP et attributs `style` (#831) : en production, `style-src` (nonce) bloque
 * tout attribut `style="…"` sérialisé par le SSR. Les liaisons `:style` à
 * valeur statique ou énumérable ont été converties en classes — ces tests
 * fixent la conversion (plus d'attribut `style`, classes attendues) pour
 * qu'une régression ne réintroduise pas une dépendance à `style-src-attr`.
 */
vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k }),
}))

vi.mock('~/composables/use_theme', () => ({
  useTheme: () => ({ resolved: 'light' }),
}))

vi.mock('@inertiajs/vue3', () => ({
  useForm: () => ({ processing: false, post: vi.fn() }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
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

import PasswordStrength from '../../inertia/components/auth/PasswordStrength.vue'
import DashboardStatsGrid from '../../inertia/components/dashboard/DashboardStatsGrid.vue'
import AboutHeroSection from '../../inertia/components/marketing/about/AboutHeroSection.vue'
import AboutOfficeSection from '../../inertia/components/marketing/about/AboutOfficeSection.vue'
import AboutTimelineSection from '../../inertia/components/marketing/about/AboutTimelineSection.vue'
import ContactHeroSection from '../../inertia/components/marketing/contact/ContactHeroSection.vue'
import ContactOfficesSection from '../../inertia/components/marketing/contact/ContactOfficesSection.vue'
import HomeFaqSection from '../../inertia/components/marketing/home/HomeFaqSection.vue'
import HomeHeroSection from '../../inertia/components/marketing/home/HomeHeroSection.vue'
import MarinaCanvas from '../../inertia/components/ports/show/MarinaCanvas.vue'
import MarinaMouillage from '../../inertia/components/ports/show/MarinaMouillage.vue'
import MarinaPontoon from '../../inertia/components/ports/show/MarinaPontoon.vue'

const canvasStubs = {
  GradientMeshCanvas: true,
  PortsMapCanvas: true,
  HomeBrowserFrame: true,
  HomeMockDashboard: true,
}

describe('PasswordStrength — classes de ton au lieu de :style', () => {
  const cases: Array<[string, string, string]> = [
    ['abcdefgh', 'bg-danger', 'text-danger'],
    ['Abcdefgh', 'bg-warning', 'text-warning'],
    ['Abcdefg1', 'bg-success', 'text-success'],
    ['Abcdefg1!', 'bg-success', 'text-success'],
  ]

  test.each(cases)('« %s » colore les segments actifs en %s', (value, segment, label) => {
    const w = mount(PasswordStrength, { props: { value } })

    expect(w.findAll('[style]')).toHaveLength(0)
    const segments = w.findAll('.h-0\\.5')
    expect(segments).toHaveLength(4)
    expect(segments[0].classes()).toContain(segment)
    expect(segments[3].classes()).toContain(value.length >= 9 ? segment : 'bg-bone')
    expect(w.get('span').classes()).toContain(label)
  })

  test('sans valeur, les quatre segments restent neutres et le libellé est absent', () => {
    const w = mount(PasswordStrength, { props: { value: '' } })

    expect(w.findAll('[style]')).toHaveLength(0)
    w.findAll('.h-0\\.5').forEach((segment) => expect(segment.classes()).toContain('bg-bone'))
    expect(w.find('span').exists()).toBe(false)
  })
})

describe('HomeFaqSection — état ouvert/fermé en classes', () => {
  const props = {
    title: 'FAQ',
    subtitle: 'Sous-titre',
    cta: { label: 'Contact', href: '/contact' },
    items: [
      { q: 'Q1', a: 'A1' },
      { q: 'Q2', a: 'A2' },
    ],
  }

  test('le premier volet est ouvert, les autres fermés, sans attribut style', async () => {
    const w = mount(HomeFaqSection, { props })

    expect(w.findAll('[style]')).toHaveLength(0)
    const panels = w.findAll('.overflow-hidden.transition-all')
    expect(panels).toHaveLength(2)
    expect(panels[0].classes()).toEqual(expect.arrayContaining(['max-h-[200px]', 'opacity-100']))
    expect(panels[1].classes()).toEqual(expect.arrayContaining(['max-h-0', 'opacity-0']))

    // Le CTA (BaseButton) est aussi un <button> : on vise le volet par sa question.
    await w
      .findAll('button')
      .find((b) => b.text().includes('Q2'))!
      .trigger('click')
    expect(panels[0].classes()).toEqual(expect.arrayContaining(['max-h-0', 'opacity-0']))
    expect(panels[1].classes()).toEqual(expect.arrayContaining(['max-h-[200px]', 'opacity-100']))
  })
})

describe('Heros marketing — entrées fadeUp en classes', () => {
  const hero = { title: 'Titre', titleHighlight: 'Fort', subtitle: 'Sous-titre' }

  test('HomeHeroSection ne pose aucun attribut style et cascade ses délais', () => {
    const w = mount(HomeHeroSection, {
      props: {
        activePersona: 'loueurs' as const,
        heroContent: { loueurs: hero, ecoles: hero, marinas: hero, armateurs: hero },
        cta: { primary: 'Commencer', secondary: 'Démo' },
        caption: 'Sans carte',
        socialProof: { eyebrow: 'Confiance', logos: ['Marina'] },
        locale: 'fr' as const,
        demoLoginPath: '/demo',
      },
      global: { stubs: canvasStubs },
    })

    expect(w.findAll('[style]')).toHaveLength(0)
    const animated = w.findAll('.animate-fade-up-slow')
    expect(animated).toHaveLength(5)
    expect(animated[0].classes()).not.toContain('[animation-delay:100ms]')
    expect(animated[1].classes()).toContain('[animation-delay:100ms]')
    expect(animated[2].classes()).toContain('[animation-delay:200ms]')
    expect(animated[3].classes()).toContain('[animation-delay:300ms]')
    expect(animated[4].classes()).toContain('[animation-delay:300ms]')
  })

  test('ContactHeroSection cascade eyebrow, titre et sous-titre', () => {
    const w = mount(ContactHeroSection, {
      props: { eyebrow: 'Contact', ...hero },
      global: { stubs: canvasStubs },
    })

    expect(w.findAll('[style]')).toHaveLength(0)
    const animated = w.findAll('.animate-fade-up-slow')
    expect(animated).toHaveLength(3)
    expect(animated[1].classes()).toContain('[animation-delay:80ms]')
    expect(animated[2].classes()).toContain('[animation-delay:160ms]')
  })

  test('AboutHeroSection cascade titre et sous-titre', () => {
    const w = mount(AboutHeroSection, {
      props: {
        line1: 'L1',
        line1Highlight: 'H1',
        line2: 'L2',
        line2Highlight: 'H2',
        subtitle: 'Sous-titre',
      },
      global: { stubs: canvasStubs },
    })

    expect(w.findAll('[style]')).toHaveLength(0)
    const animated = w.findAll('.animate-fade-up-slow')
    expect(animated).toHaveLength(2)
    expect(animated[1].classes()).toContain('[animation-delay:100ms]')
  })
})

describe('Cartes bureaux — hauteur fixe en classe, gradient de données conservé', () => {
  const office = {
    city: 'Brest',
    role: 'Siège',
    addr: '1 rue du Port',
    hours: '9h-18h',
    team: '4',
    hint: 'Sur rendez-vous',
    gradient: 'linear-gradient(135deg, #0b1d2e, #1a3a55)',
  }

  test('AboutOfficeSection', () => {
    const w = mount(AboutOfficeSection, {
      props: {
        eyebrow: 'Bureaux',
        title: 'Titre',
        titleHighlight: 'Fort',
        body: 'Corps',
        locationLabel: 'Adresse',
        hoursLabel: 'Horaires',
        teamLabel: 'Équipe',
        locations: [{ city: 'Brest', addr: '1 rue du Port', role: 'Siège' }],
        officeCards: [office],
      },
    })

    const header = w.get('.h-\\[140px\\]')
    expect(header.attributes('style')).toContain('linear-gradient')
    expect(header.attributes('style')).not.toContain('height')
  })

  test('ContactOfficesSection', () => {
    const w = mount(ContactOfficesSection, {
      props: {
        eyebrow: 'Bureaux',
        title: 'Titre',
        titleHighlight: 'Fort',
        subtitle: 'Sous-titre',
        addrLabel: 'Adresse',
        hoursLabel: 'Horaires',
        teamLabel: 'Équipe',
        items: [office],
      },
    })

    const header = w.get('.h-\\[160px\\]')
    expect(header.attributes('style')).toContain('linear-gradient')
    expect(header.attributes('style')).not.toContain('height')
  })
})

describe('AboutTimelineSection — pastilles en classes de palette', () => {
  test('chaque ton mappe vers un fond et un liseré de la palette', () => {
    const w = mount(AboutTimelineSection, {
      props: {
        eyebrow: 'Histoire',
        title: 'Titre',
        titleHighlight: 'Fort',
        subtitle: 'Sous-titre',
        items: [
          { d: '2024', t: 'Lancement', sub: 'Bêta', tone: 'coral' },
          { d: '2025', t: 'Croissance', sub: 'Ports', tone: 'mint' },
          { d: '2026', t: 'Suite', sub: 'À venir' },
        ],
      },
    })

    expect(w.findAll('[style]')).toHaveLength(0)
    const dots = w.findAll('.border-\\[3px\\]')
    expect(dots).toHaveLength(3)
    expect(dots[0].classes()).toEqual(expect.arrayContaining(['bg-coral-500', 'border-coral-100']))
    expect(dots[1].classes()).toEqual(expect.arrayContaining(['bg-mint-700', 'border-mint-100']))
    expect(dots[2].classes()).toEqual(
      expect.arrayContaining(['bg-surface-elevated', 'border-bone'])
    )
  })
})

describe('Marina — curseurs en classes', () => {
  const spots: SpotRow[] = [
    { id: 1, name: 'A1', description: null, boat: null },
    { id: 2, name: 'A2', description: null, boat: { id: 9, name: 'Albatros' } },
  ]
  const pontoon: PontoonRow = {
    id: 1,
    name: 'Ponton A',
    description: null,
    positionX: 0,
    positionY: 0,
    spots,
  }
  const mouillage: MouillageRow = { ...pontoon, id: 2, name: 'Mouillage B' }

  test.each([
    [true, 'cursor-grab'],
    [false, 'cursor-pointer'],
  ])('MarinaPontoon en édition=%s → %s, places cliquables', (editMode, cursor) => {
    const w = mount(MarinaPontoon, {
      props: { pontoon, x: 0, y: 0, editMode, selectedBoatId: null },
    })

    expect(w.findAll('[style]')).toHaveLength(0)
    expect(w.get('[data-testid="marina-pontoon-1"]').classes()).toContain(cursor)
    expect(w.get('[data-testid="marina-spot-1"]').classes()).toContain('cursor-pointer')
  })

  test.each([
    [true, 'cursor-grab'],
    [false, 'cursor-pointer'],
  ])('MarinaMouillage en édition=%s → %s, places cliquables', (editMode, cursor) => {
    const w = mount(MarinaMouillage, {
      props: { mouillage, x: 0, y: 0, editMode, selectedBoatId: null },
    })

    expect(w.findAll('[style]')).toHaveLength(0)
    expect(w.get('[data-testid="marina-mouillage-2"]').classes()).toContain(cursor)
    expect(w.get('[data-testid="marina-spot-2"]').classes()).toContain('cursor-pointer')
  })
})

describe('MarinaCanvas — curseur et touch-action en classes', () => {
  test.each([
    [false, 'cursor-default'],
    [true, 'cursor-grab'],
  ])('en édition=%s le svg porte %s et touch-none', (editMode, cursor) => {
    const w = mount(MarinaCanvas, {
      props: { pontoons: [], mouillages: [], editMode, selectedBoatId: null },
    })

    const svg = w.get('svg')
    expect(svg.attributes('style')).toBeUndefined()
    expect(svg.classes()).toEqual(expect.arrayContaining(['touch-none', cursor]))
  })
})

describe('DashboardStatsGrid — cascade fadeUp en classes', () => {
  const stats: DashboardStats = {
    boats: 3,
    engines: 2,
    sails: 1,
    rigs: 1,
    urgentMaintenance: 0,
    deltas: {
      boatsInAlert: 0,
      boatsWithEngine: 2,
      boatsWithSail: 1,
      boatsWithRig: 1,
      overdueCount: 0,
    },
  }

  test('les quatre cartes portent animate-fade-up et des délais croissants', () => {
    const w = mount(DashboardStatsGrid, { props: { stats } })

    expect(w.findAll('[style]')).toHaveLength(0)
    const cards = w.findAll('a')
    expect(cards).toHaveLength(4)
    cards.forEach((card) => expect(card.classes()).toContain('animate-fade-up'))
    expect(cards[1].classes()).toContain('[animation-delay:60ms]')
    expect(cards[2].classes()).toContain('[animation-delay:120ms]')
    expect(cards[3].classes()).toContain('[animation-delay:180ms]')
  })

  test('la carte « équipements vides » entre avec le même délai que la 2e carte', () => {
    const w = mount(DashboardStatsGrid, {
      props: { stats: { ...stats, engines: 0, sails: 0, rigs: 0 } },
    })

    expect(w.findAll('[style]')).toHaveLength(0)
    const card = w.get('[data-testid="equipment-empty-card"]')
    expect(card.classes()).toEqual(
      expect.arrayContaining(['animate-fade-up', '[animation-delay:60ms]'])
    )
  })
})
