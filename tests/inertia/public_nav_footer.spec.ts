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
  // Le lien « Conditions » (public.footer.terms) a été retiré en attendant une vraie page CGU.
  expect(w.html()).not.toContain('public.footer.terms')
})
