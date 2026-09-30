import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'

const { pageProps, reload } = vi.hoisted(() => ({
  pageProps: { user: undefined as unknown },
  reload: vi.fn(),
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, vars?: Record<string, string>) =>
      vars?.seconds ? `${key}:${vars.seconds}` : key,
  }),
}))

vi.mock('@inertiajs/vue3', () => ({
  Head: { template: '<div><slot /></div>' },
  usePage: () => ({ props: pageProps }),
  router: { reload },
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    name: 'MockInertiaLink',
    props: { href: { type: String, required: false } },
    template: '<a :href="href"><slot /></a>',
  },
}))

vi.mock('~/layouts/error.vue', () => ({
  default: { template: '<div><slot /></div>' },
}))

vi.mock('~/layouts/bare.vue', () => ({
  default: { template: '<div><slot /></div>' },
}))

import SessionExpired from '../../inertia/pages/errors/session_expired.vue'
import TooManyRequests from '../../inertia/pages/errors/too_many_requests.vue'
import Maintenance from '../../inertia/pages/errors/maintenance.vue'

test('session expired explains the expiry and reloads on click', async () => {
  pageProps.user = undefined
  reload.mockClear()
  const w = mount(SessionExpired)

  expect(w.text()).toContain('419')
  expect(w.text()).toContain('errors.sessionExpired.title')
  expect(w.text()).toContain('errors.sessionExpired.description')
  expect(w.get('a').attributes('href')).toBe('/')

  await w.get('button').trigger('click')
  expect(reload).toHaveBeenCalledOnce()
})

test('too many requests shows the countdown and hides signup by default', () => {
  pageProps.user = { id: 1 }
  const w = mount(TooManyRequests, { props: { retryAfter: 42, offerSignup: false } })

  expect(w.text()).toContain('errors.tooManyRequests.retryIn:42')
  expect(w.find('a[href="/signup"]').exists()).toBe(false)
  expect(w.get('a').attributes('href')).toBe('/dashboard')
})

test('too many requests offers signup on the public AI routes', () => {
  pageProps.user = undefined
  const w = mount(TooManyRequests, { props: { retryAfter: 0, offerSignup: true } })

  expect(w.text()).toContain('errors.tooManyRequests.retryNow')
  expect(w.text()).toContain('errors.tooManyRequests.signupHint')
  expect(w.get('a[href="/signup"]').text()).toContain('errors.tooManyRequests.signup')
})

test('maintenance page is a bare retry screen', () => {
  const w = mount(Maintenance)

  expect(w.text()).toContain('errors.maintenance.title')
  expect(w.text()).toContain('errors.maintenance.description')
  expect(w.get('button').text()).toContain('errors.maintenance.action')
})
