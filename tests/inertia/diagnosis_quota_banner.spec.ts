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

import DiagnosisQuotaBanner from '../../inertia/components/marketing/diagnosis/DiagnosisQuotaBanner.vue'

test('shows the remaining free diagnoses', () => {
  const w = mount(DiagnosisQuotaBanner, {
    props: { quota: { used: 1, limit: 2 }, isAuthenticated: false },
  })
  expect(w.text()).toContain('publicDiagnosis.quota_remaining')
  expect(w.text()).toContain('"remaining":"1"')
})

test('shows the exhausted state with a signup CTA when the quota is spent', () => {
  const w = mount(DiagnosisQuotaBanner, {
    props: { quota: { used: 2, limit: 2 }, isAuthenticated: false },
  })
  expect(w.text()).toContain('publicDiagnosis.quota_exhausted_title')
  const link = w.find('a[data-link]')
  expect(link.exists()).toBe(true)
  expect(link.attributes('href')).toBe('/signup?from=diagnostic')
})

test('renders nothing for unlimited plans (limit null)', () => {
  const w = mount(DiagnosisQuotaBanner, {
    props: { quota: { used: 0, limit: null }, isAuthenticated: true },
  })
  expect(w.text().trim()).toBe('')
})
