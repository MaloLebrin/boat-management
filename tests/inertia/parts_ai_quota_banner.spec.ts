import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string>) =>
      key + (params ? `:${JSON.stringify(params)}` : ''),
  }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    name: 'MockInertiaLink',
    props: { href: { type: String, required: false } },
    template: '<a data-link :href="href"><slot /></a>',
  },
}))

import PartsAiQuotaBanner from '../../inertia/components/marketing/parts_ai/PartsAiQuotaBanner.vue'

test('shows the remaining free searches', () => {
  const w = mount(PartsAiQuotaBanner, {
    props: { quota: { used: 1, limit: 2 }, isAuthenticated: false },
  })
  expect(w.text()).toContain('publicPartSearch.quota_remaining')
  expect(w.text()).toContain('"remaining":"1"')
})

test('shows the exhausted state with a signup CTA when the quota is spent', () => {
  const w = mount(PartsAiQuotaBanner, {
    props: { quota: { used: 2, limit: 2 }, isAuthenticated: false },
  })
  expect(w.text()).toContain('publicPartSearch.quota_exhausted_title')
  const link = w.find('a[data-link]')
  expect(link.exists()).toBe(true)
  expect(link.attributes('href')).toBe('/signup?from=parts')
})

test('hides the CTA for an authenticated visitor and renders nothing when unlimited', () => {
  const authed = mount(PartsAiQuotaBanner, {
    props: { quota: { used: 2, limit: 2 }, isAuthenticated: true },
  })
  expect(authed.find('a[data-link]').exists()).toBe(false)

  const unlimited = mount(PartsAiQuotaBanner, {
    props: { quota: { used: 0, limit: null }, isAuthenticated: true },
  })
  expect(unlimited.text().trim()).toBe('')
})
