import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'

const { pageProps } = vi.hoisted(() => ({
  pageProps: { user: undefined as unknown },
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: pageProps }),
}))

vi.mock('~/layouts/default.vue', () => ({
  default: { name: 'DefaultLayout', template: '<div data-layout="app"><slot /></div>' },
}))

vi.mock('~/layouts/public.vue', () => ({
  default: { name: 'PublicLayout', template: '<div data-layout="public"><slot /></div>' },
}))

import ErrorLayout from '../../inertia/layouts/error.vue'

// #458 : sans la coquille de l'app, un utilisateur connecté qui tombe sur un 403
// perd la sidebar et se retrouve sur l'habillage marketing.
test('keeps the app shell for an authenticated user', () => {
  pageProps.user = { id: 1 }
  const w = mount(ErrorLayout, { slots: { default: '<p>content</p>' } })

  expect(w.find('[data-layout="app"]').exists()).toBe(true)
  expect(w.find('[data-layout="public"]').exists()).toBe(false)
  expect(w.text()).toContain('content')
})

test('falls back to the public layout for an anonymous visitor', () => {
  pageProps.user = undefined
  const w = mount(ErrorLayout, { slots: { default: '<p>content</p>' } })

  expect(w.find('[data-layout="public"]').exists()).toBe(true)
  expect(w.find('[data-layout="app"]').exists()).toBe(false)
})
