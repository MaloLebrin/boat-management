import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    usePage: () => ({ props: { locale: 'fr', path: '/fr' }, url: '/fr' }),
    router: { visit: vi.fn(), post: vi.fn() },
  }
})

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { props: ['href'], template: '<a :href="href"><slot /></a>' },
}))

import AppHeader from '../../inertia/components/layout/AppHeader.vue'
import AppHeaderMobileDrawer from '../../inertia/components/layout/AppHeaderMobileDrawer.vue'
import PublicLayout from '../../inertia/layouts/public.vue'

const stubs = {
  AppHeaderMobileDrawer: { template: '<div />' },
  BaseButton: { template: '<button><slot /></button>' },
}

test('la nav publique du header n’expose pas /design-system', () => {
  const w = mount(AppHeader, { global: { stubs } })
  expect(w.html()).not.toContain('/design-system')
  expect(w.text().toLowerCase()).not.toContain('design system')
})

test('le footer public ne contient aucun lien mort (href="#")', () => {
  const w = mount(PublicLayout, {
    global: { stubs: { ...stubs, AppHeader: { template: '<div />' } } },
  })
  const deadLinks = w.findAll('a[href="#"]')
  expect(deadLinks.length).toBe(0)
})

// Le lien « CGU » avait été retiré du footer faute de page ; elle existe depuis #455.
test('le footer public renvoie vers les CGU de la locale courante', () => {
  const w = mount(PublicLayout, {
    global: { stubs: { ...stubs, AppHeader: { template: '<div />' } } },
  })

  expect(w.html()).toContain('public.footer.terms')
  expect(w.findAll('a[href="/fr/cgu"]').length).toBe(1)
})

// #466 — sans mentions légales ni CGV dans le footer, un SaaS payant opéré en
// France est hors LCEN. Les deux pages doivent être atteignables depuis le pied
// de page, dans la locale courante.
test('le footer public renvoie vers les mentions légales et les CGV', () => {
  const w = mount(PublicLayout, {
    global: { stubs: { ...stubs, AppHeader: { template: '<div />' } } },
  })

  expect(w.html()).toContain('public.footer.legalNotice')
  expect(w.html()).toContain('public.footer.salesTerms')
  expect(w.findAll('a[href="/fr/mentions-legales"]').length).toBe(1)
  expect(w.findAll('a[href="/fr/cgv"]').length).toBe(1)
})

// Header public à quatre entrées (2026-10) : Produit ▾ (fonctionnalités +
// outils gratuits), Diagnostic IA en lien direct, Tarifs, Ressources ▾ (guide,
// aide). On ouvre un menu déroulant par son libellé avant d'asserter.
async function mountHeaderWithOpenMenu(labelKey: string) {
  const w = mount(AppHeader, { global: { stubs } })
  const trigger = w
    .findAll('button[aria-haspopup="true"]')
    .find((button) => button.text().includes(labelKey))
  if (!trigger) throw new Error(`menu ${labelKey} introuvable`)
  await trigger.trigger('click')
  return w
}

const FEATURE_HREFS = [
  '/fr/carnet-entretien-bateau',
  '/fr/gestion-flotte-bateaux',
  '/fr/assistant-ia-bateau',
  '/fr/instruments-bateau-connectes',
]

const TOOL_HREFS = [
  '/fr/simulateur-cout-entretien',
  '/fr/diagnostic-panne-ia',
  '/fr/reference-piece-moteur-ia',
]

const RESOURCE_HREFS = ['/fr/cout-entretien-bateau', '/fr/aide']

test('le header desktop expose quatre entrées : Produit, Diagnostic IA, Tarifs, Ressources', () => {
  const w = mount(AppHeader, { global: { stubs } })
  const nav = w.get('nav')

  const triggers = nav.findAll('button[aria-haspopup="true"]').map((b) => b.text())
  expect(triggers).toEqual(['public.nav.product', 'public.nav.resources'])
  expect(nav.findAll('a').map((a) => a.attributes('href'))).toEqual([
    '/fr/diagnostic-panne-ia',
    '/fr/tarifs',
  ])
})

// #609 — le diagnostic de panne IA est notre meilleur argument d'entrée : lien
// direct du header, visible sans ouvrir un menu.
test('la nav publique du header renvoie vers le diagnostic de panne IA sans ouvrir de menu', () => {
  const w = mount(AppHeader, { global: { stubs } })

  expect(w.html()).toContain('public.nav.diagnosisAi')
  expect(w.findAll('a[href="/fr/diagnostic-panne-ia"]').length).toBe(1)
})

test('le menu Produit renvoie vers les pages fonctionnalité et les outils gratuits', async () => {
  const w = await mountHeaderWithOpenMenu('public.nav.product')

  expect(w.html()).toContain('public.nav.productFeaturesGroup')
  expect(w.html()).toContain('public.nav.productToolsGroup')
  for (const href of FEATURE_HREFS) {
    expect(w.findAll(`a[href="${href}"]`).length).toBe(1)
  }
  expect(w.findAll('a[href="/fr/simulateur-cout-entretien"]').length).toBe(1)
  expect(w.findAll('a[href="/fr/reference-piece-moteur-ia"]').length).toBe(1)
  // Lien direct + entrée du groupe « Outils gratuits ».
  expect(w.findAll('a[href="/fr/diagnostic-panne-ia"]').length).toBe(2)
  for (const href of RESOURCE_HREFS) {
    expect(w.findAll(`a[href="${href}"]`).length).toBe(0)
  }
})

test('le menu Ressources renvoie vers le guide et l’aide, sans intertitre', async () => {
  const w = await mountHeaderWithOpenMenu('public.nav.resources')

  for (const href of RESOURCE_HREFS) {
    expect(w.findAll(`a[href="${href}"]`).length).toBe(1)
  }
  expect(w.findAll('a[href="/fr/carnet-entretien-bateau"]').length).toBe(0)
})

test('le header public porte un bouton de thème unique, pas le sélecteur à trois boutons', () => {
  const w = mount(AppHeader, { global: { stubs } })

  expect(w.findAll('[data-testid="theme-toggle"]').length).toBe(1)
  expect(w.find('[role="group"]').exists()).toBe(false)
})

test('le drawer mobile renvoie vers les pages fonctionnalité, les outils gratuits, les tarifs, le guide et l’aide', () => {
  const w = mount(AppHeaderMobileDrawer, {
    props: { isOpen: true, locale: 'fr', isAuthed: false },
    global: { stubs },
  })

  expect(w.html()).toContain('public.nav.productToolsGroup')
  for (const href of [...FEATURE_HREFS, ...TOOL_HREFS, '/fr/tarifs', ...RESOURCE_HREFS]) {
    expect(w.findAll(`a[href="${href}"]`).length).toBe(1)
  }
})

test('le footer public renvoie vers les pages fonctionnalité et l’aide', () => {
  const w = mount(PublicLayout, {
    global: { stubs: { ...stubs, AppHeader: { template: '<div />' } } },
  })

  expect(w.html()).toContain('public.footer.resources')
  for (const href of [
    '/fr/carnet-entretien-bateau',
    '/fr/gestion-flotte-bateaux',
    '/fr/assistant-ia-bateau',
    '/fr/instruments-bateau-connectes',
    '/fr/aide',
  ]) {
    expect(w.findAll(`a[href="${href}"]`).length).toBe(1)
  }
})
