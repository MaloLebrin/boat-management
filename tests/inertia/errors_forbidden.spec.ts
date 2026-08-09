import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'

const { pageProps } = vi.hoisted(() => ({
  pageProps: { user: undefined as unknown },
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@inertiajs/vue3', () => ({
  Head: { template: '<div><slot /></div>' },
  usePage: () => ({ props: pageProps }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    name: 'MockInertiaLink',
    props: { href: { type: String, required: false } },
    template: '<a :href="href"><slot /></a>',
  },
}))

// Le layout d'erreur agrège les layouts app/public : hors périmètre de ce test,
// et il n'est de toute façon pas monté par `mount(Forbidden)`.
vi.mock('~/layouts/error.vue', () => ({
  default: { template: '<div><slot /></div>' },
}))

import Forbidden from '../../inertia/pages/errors/forbidden.vue'

test('renders the forbidden title, description and exit link', () => {
  pageProps.user = { id: 1 }
  const w = mount(Forbidden)

  expect(w.text()).toContain('errors.forbidden.title')
  expect(w.text()).toContain('errors.forbidden.description')
  expect(w.text()).toContain('errors.forbidden.action')
})

test('links an authenticated user back to the dashboard via Inertia Link', () => {
  pageProps.user = { id: 1 }
  const w = mount(Forbidden)

  const link = w.find('a')
  expect(link.exists()).toBe(true)
  expect(link.attributes('href')).toBe('/dashboard')
})

// Un visiteur anonyme envoyé sur /dashboard rebondirait sur l'écran de connexion,
// ce qui ressemble à une seconde erreur (#458) : on le renvoie à l'accueil public.
test('links an anonymous visitor back to the public home page', () => {
  pageProps.user = undefined
  const w = mount(Forbidden)

  const link = w.find('a')
  expect(link.attributes('href')).toBe('/')
  expect(w.text()).toContain('errors.backHome')
})
