import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
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
        brand: { name: 'Fleet AI', tagline: 'Fleet intelligence' },
        meta: { title: 'T', description: 'D' },
        home: {
          hero: {
            cta: { primary: 'Get started', secondary: 'View pricing' },
            caption: 'Caption',
            content: {
              loueurs: {
                title: 'Fleet maintenance, powered by AI clarity.',
                titleHighlight: 'AI',
                subtitle: 'S',
              },
              ecoles: { title: 'T2', titleHighlight: 'T', subtitle: 'S' },
              marinas: { title: 'T3', titleHighlight: 'T', subtitle: 'S' },
              armateurs: { title: 'T4', titleHighlight: 'T', subtitle: 'S' },
            },
          },
          socialProof: { eyebrow: 'Trusted', logos: ['A', 'B', 'C', 'D', 'E', 'F'] },
          problem: {
            title: 'Problem',
            titleHighlight: 'Problem',
            items: [
              { number: '1', label: 'L1', title: 'One', stat: '90%', statSub: 'Sub', body: 'D' },
              { number: '2', label: 'L2', title: 'Two', stat: '80%', statSub: 'Sub', body: 'D' },
            ],
          },
          pillars: {
            title: 'Pillars',
            titleHighlight: 'Pillars',
            items: [
              { number: '1', title: 'P1', description: 'D1' },
              { number: '2', title: 'P2', description: 'D2' },
              { number: '3', title: 'P3', description: 'D3' },
            ],
          },
          features: [
            { eyebrow: 'E1', title: 'F1', titleHighlight: 'F', body: 'B1', bullets: ['b1', 'b2'] },
            { eyebrow: 'E2', title: 'F2', titleHighlight: 'F', body: 'B2', bullets: ['b1', 'b2'] },
            { eyebrow: 'E3', title: 'F3', titleHighlight: 'F', body: 'B3', bullets: ['b1', 'b2'] },
          ],
          personas: {
            title: 'Personas',
            subtitle: 'Sub',
            ctaLabel: 'CTA',
            items: [
              {
                key: 'loueurs',
                icon: '🚤',
                tabLabel: 'L',
                title: 'T',
                subtitle: 'S',
                bullets: ['b1'],
                quote: { text: 'Q', author: 'A', role: 'R' },
                stat: { value: '10', label: 'L' },
              },
              {
                key: 'ecoles',
                icon: '🎓',
                tabLabel: 'E',
                title: 'T',
                subtitle: 'S',
                bullets: ['b1'],
                quote: { text: 'Q', author: 'A', role: 'R' },
                stat: { value: '10', label: 'L' },
              },
              {
                key: 'marinas',
                icon: '⚓',
                tabLabel: 'M',
                title: 'T',
                subtitle: 'S',
                bullets: ['b1'],
                quote: { text: 'Q', author: 'A', role: 'R' },
                stat: { value: '10', label: 'L' },
              },
              {
                key: 'armateurs',
                icon: '🛳️',
                tabLabel: 'A',
                title: 'T',
                subtitle: 'S',
                bullets: ['b1'],
                quote: { text: 'Q', author: 'A', role: 'R' },
                stat: { value: '10', label: 'L' },
              },
            ],
          },
          statsBand: [
            { value: '3', label: 'Overdue' },
            { value: '7', label: 'Due soon' },
            { value: '42', label: 'Assets' },
          ],
          comparison: {
            title: 'Comparison',
            subtitle: 'Sub',
            cols: { feature: 'Feature', excel: 'Excel', paper: 'Paper', fleetai: 'Fleet AI' },
            rows: [{ feature: 'F1', excel: 'E', paper: 'P', fleetai: 'FA' }],
          },
          testimonials: {
            title: 'Testimonials',
            items: [{ quote: 'Q', author: 'A', role: 'R' }],
          },
          security: {
            title: 'Security',
            subtitle: 'Sub',
            items: [
              { icon: '🔒', title: 'S1', description: 'D' },
              { icon: '🔒', title: 'S2', description: 'D' },
            ],
          },
          faq: {
            title: 'FAQ',
            subtitle: 'Sub',
            cta: { label: 'Contact', href: '/contact' },
            items: [
              { q: 'Q1', a: 'A1' },
              { q: 'Q2', a: 'A2' },
            ],
          },
          finalCta: {
            title: 'Final',
            titleHighlight: 'Final',
            subtitle: 'Sub',
            primaryCta: 'Start',
            secondaryCta: 'Pricing',
          },
        },
      },
    },
  })

  expect(w.text()).toContain('Fleet maintenance, powered by AI clarity.')
})
