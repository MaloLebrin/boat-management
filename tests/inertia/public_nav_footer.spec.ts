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

// #609 — la page publique de diagnostic IA n'était reliée au site que par le
// footer. C'est notre meilleur argument d'entrée : elle doit être atteignable
// depuis la nav principale, desktop comme mobile.
test('la nav publique du header renvoie vers le diagnostic de panne IA', () => {
  const w = mount(AppHeader, { global: { stubs } })

  expect(w.html()).toContain('public.nav.diagnosisAi')
  expect(w.findAll('a[href="/fr/diagnostic-panne-ia"]').length).toBe(1)
})

test('le drawer mobile renvoie vers le diagnostic de panne IA', () => {
  const w = mount(AppHeaderMobileDrawer, {
    props: { isOpen: true, locale: 'fr', guideHref: '/fr/cout-entretien-bateau', isAuthed: false },
    global: { stubs },
  })

  expect(w.html()).toContain('public.nav.diagnosisAi')
  expect(w.findAll('a[href="/fr/diagnostic-panne-ia"]').length).toBe(1)
})

// #634 Phase 2 — la recherche de références de pièces est le second tunnel
// d'acquisition IA : atteignable depuis la nav principale, le drawer mobile et
// le footer, dans la locale courante.
test('la nav publique renvoie vers la recherche de pièces IA (header, drawer, footer)', () => {
  const header = mount(AppHeader, { global: { stubs } })
  expect(header.html()).toContain('public.nav.partsAi')
  expect(header.findAll('a[href="/fr/reference-piece-moteur-ia"]').length).toBe(1)

  const drawer = mount(AppHeaderMobileDrawer, {
    props: { isOpen: true, locale: 'fr', guideHref: '/fr/cout-entretien-bateau', isAuthed: false },
    global: { stubs },
  })
  expect(drawer.html()).toContain('public.nav.partsAi')
  expect(drawer.findAll('a[href="/fr/reference-piece-moteur-ia"]').length).toBe(1)

  const footer = mount(PublicLayout, {
    global: { stubs: { ...stubs, AppHeader: { template: '<div />' } } },
  })
  expect(footer.html()).toContain('public.footer.partsAi')
  expect(footer.findAll('a[href="/fr/reference-piece-moteur-ia"]').length).toBe(1)
})
