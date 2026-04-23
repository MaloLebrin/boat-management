import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import MarketingHome from '../../inertia/pages/marketing/home.vue'

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    Head: { template: '<div><slot /></div>' },
    Link: { template: '<a><slot /></a>' },
    usePage: () => ({ props: { locale: 'en' } }),
  }
})

test('renders hero title (en)', () => {
  const w = mount(MarketingHome, {
    props: {
      t: {
        brand: { name: 'Fleetide AI', tagline: 'Fleet intelligence' },
        nav: { pricing: 'Pricing', login: 'Login', signup: 'Signup' },
        meta: { title: 'T', description: 'D' },
        home: {
          hero: {
            eyebrow: 'Fleetide AI',
            title: 'Fleet maintenance, powered by AI clarity.',
            subtitle: 'S',
          },
          cta: { primary: 'Get started', secondary: 'View pricing' },
          socialProof: { title: 'Trusted', logos: ['A', 'B', 'C', 'D', 'E', 'F'] },
          stats: {
            title: 'Signals',
            items: [
              { label: 'Overdue', value: '3', hint: 'urgent' },
              { label: 'Due soon', value: '7', hint: '14d' },
              { label: 'Assets', value: '42', hint: 'tracked' },
            ],
          },
          problem: {
            title: 'Problem',
            items: [
              { title: 'One', description: 'Desc' },
              { title: 'Two', description: 'Desc' },
            ],
          },
          features: {
            title: 'Features',
            subtitle: 'Sub',
            items: [
              { title: 'F1', description: 'D1' },
              { title: 'F2', description: 'D2' },
              { title: 'F3', description: 'D3' },
              { title: 'F4', description: 'D4' },
              { title: 'F5', description: 'D5' },
              { title: 'F6', description: 'D6' },
            ],
          },
          useCases: {
            title: 'Use cases',
            items: [
              { title: 'U1', description: 'D' },
              { title: 'U2', description: 'D' },
              { title: 'U3', description: 'D' },
            ],
          },
          preview: { title: 'Preview', subtitle: 'Sub' },
          security: {
            title: 'Security',
            items: [
              { title: 'S1', description: 'D' },
              { title: 'S2', description: 'D' },
              { title: 'S3', description: 'D' },
              { title: 'S4', description: 'D' },
            ],
          },
          faq: {
            title: 'FAQ',
            items: [
              { q: 'Q1', a: 'A1' },
              { q: 'Q2', a: 'A2' },
              { q: 'Q3', a: 'A3' },
              { q: 'Q4', a: 'A4' },
              { q: 'Q5', a: 'A5' },
              { q: 'Q6', a: 'A6' },
            ],
          },
          finalCta: { title: 'Final', subtitle: 'Sub', primary: 'Start', secondary: 'Pricing' },
        },
      },
    },
  })

  expect(w.text()).toContain('Fleet maintenance, powered by AI clarity.')
})
