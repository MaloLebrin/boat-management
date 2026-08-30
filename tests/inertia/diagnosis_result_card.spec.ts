import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    name: 'MockInertiaLink',
    props: { href: { type: String, required: false } },
    template: '<a data-link :href="href"><slot /></a>',
  },
}))

import DiagnosisResultCard from '../../inertia/components/marketing/diagnosis/DiagnosisResultCard.vue'

const RESULT = {
  summary: 'Probable fuel supply issue',
  causes: ['Closed tank vent', 'Clogged fuel filter'],
  nextStep: 'Check that the primer bulb firms up completely',
}

test('renders summary, ordered causes and next step', () => {
  const w = mount(DiagnosisResultCard, { props: { result: RESULT, isAuthenticated: false } })
  expect(w.text()).toContain('Probable fuel supply issue')
  expect(w.text()).toContain('Closed tank vent')
  expect(w.text()).toContain('Clogged fuel filter')
  expect(w.text()).toContain('Check that the primer bulb firms up completely')
  expect(w.text()).toContain('publicDiagnosis.result_disclaimer')
})

test('the signup CTA targets /signup?from=diagnostic for anonymous visitors', () => {
  const w = mount(DiagnosisResultCard, { props: { result: RESULT, isAuthenticated: false } })
  const link = w.find('a[data-link]')
  expect(link.exists()).toBe(true)
  expect(link.attributes('href')).toBe('/signup?from=diagnostic')
})

test('the signup CTA is hidden for authenticated users', () => {
  const w = mount(DiagnosisResultCard, { props: { result: RESULT, isAuthenticated: true } })
  expect(w.find('a[data-link]').exists()).toBe(false)
  expect(w.text()).not.toContain('publicDiagnosis.result_cta_title')
})
