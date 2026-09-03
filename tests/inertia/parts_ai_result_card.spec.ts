import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import type { PartSearchResult } from '../../shared/types/spare_part_chat'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string>) =>
      key + (params ? `:${JSON.stringify(params)}` : ''),
  }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDate: (d: string) => `date(${d})` }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    props: ['href'],
    template: '<a :href="href"><slot /></a>',
  },
}))

import PartsAiResultCard from '../../inertia/components/marketing/parts_ai/PartsAiResultCard.vue'

const ENGINE = { brand: 'Yamaha', model: '6E0', catalogBrandSlug: 'yamaha' }

const KNOWN_REFERENCE = {
  partKey: 'lower-unit.impeller',
  reference: '6E0-44352-00',
  sourceLabel: 'Catalogue Partzilla — Yamaha',
  sourceUrl: 'https://www.partzilla.com/catalog/yamaha',
  verifiedAt: null,
}

function mountCard(result: PartSearchResult, isAuthenticated = false) {
  return mount(PartsAiResultCard, {
    props: { result, engine: ENGINE, isAuthenticated },
  })
}

test('a known reference renders sourced with the public (informal) labels', () => {
  const w = mountCard({ partKey: 'lower-unit.impeller', reference: KNOWN_REFERENCE })

  // La référence sort toujours avec sa source (invariant #575)…
  expect(w.text()).toContain('6E0-44352-00')
  expect(w.text()).toContain('Catalogue Partzilla — Yamaha')
  // …et avec les libellés du namespace public : les clés `parts.*` vouvoient,
  // interdites sur une page qui tutoie.
  expect(w.text()).toContain('publicPartSearch.reference.label')
  expect(w.text()).not.toContain('parts.reference.label')
})

test('a part without a known reference falls back on retailers with public labels', () => {
  const w = mountCard({ partKey: 'lower-unit.impeller', reference: null })

  expect(w.text()).toContain('publicPartSearch.result_no_reference')
  // Repli revendeurs de #517, marque couverte par le corpus → liens Yamaha.
  expect(w.text()).toContain('Partzilla')
  expect(w.text()).toContain('publicPartSearch.retailers.title')
  expect(w.text()).not.toContain('parts.assembly.explodedTitle')
  // Pas de lien vers l'app connectée : la page est publique.
  expect(w.find('a[href^="/boats/"]').exists()).toBe(false)
})

test('no matching catalog part shows the honest miss', () => {
  const w = mountCard({ partKey: null, reference: null })

  expect(w.text()).toContain('publicPartSearch.result_no_match')
})

test('the signup CTA targets the parts funnel and hides for authenticated visitors', () => {
  const anonymous = mountCard({ partKey: null, reference: null }, false)
  const cta = anonymous.find('a[href="/signup?from=parts"]')
  expect(cta.exists()).toBe(true)
  expect(anonymous.text()).toContain('publicPartSearch.result_cta_title')

  const authed = mountCard({ partKey: null, reference: null }, true)
  expect(authed.find('a[href="/signup?from=parts"]').exists()).toBe(false)
})
