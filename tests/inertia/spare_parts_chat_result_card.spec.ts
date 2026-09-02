import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import type { SparePartsEngineProps } from '../../shared/types/spare_parts'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDate: (d: string) => `date(${d})` }),
}))

const routerPost = vi.fn()
vi.mock('@inertiajs/vue3', () => ({
  router: { post: (...args: unknown[]) => routerPost(...args) },
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    props: ['href'],
    template: '<a :href="href"><slot /></a>',
  },
}))

import SparePartsChatResultCard from '../../inertia/components/spare_parts/chat/SparePartsChatResultCard.vue'

const ENGINE: SparePartsEngineProps = {
  id: 2,
  brand: 'Yamaha',
  model: '4AS',
  catalogBrandSlug: 'yamaha',
  referencePattern: null,
  modelCodeMatches: 1,
  serialNumber: '6E0-S-123456',
  kind: 'outboard',
  family: 'outboard_2t',
  status: 'operational',
}

const KNOWN_REFERENCE = {
  partKey: 'lower-unit.impeller',
  reference: '6E0-44352-00',
  sourceLabel: 'Catalogue Partzilla — Yamaha',
  sourceUrl: 'https://www.partzilla.com/catalog/yamaha',
  verifiedAt: null,
}

function mountCard(
  result: { partKey: string | null; reference: typeof KNOWN_REFERENCE | null },
  canManage = true
) {
  return mount(SparePartsChatResultCard, {
    props: { boatId: 1, engine: ENGINE, result, canManage },
  })
}

test('a known reference renders sourced and can be pushed to the repair cart', async () => {
  routerPost.mockClear()
  const w = mountCard({ partKey: 'lower-unit.impeller', reference: KNOWN_REFERENCE })

  // La référence sort toujours avec sa source (invariant #575).
  expect(w.text()).toContain('6E0-44352-00')
  expect(w.text()).toContain('Catalogue Partzilla — Yamaha')

  const button = w.findAll('button').find((b) => b.text().includes('parts.ai.addToCart'))
  expect(button).toBeDefined()
  await button!.trigger('click')
  expect(routerPost).toHaveBeenCalledWith(
    '/boats/1/engines/2/spare-parts/cart',
    { partKey: 'lower-unit.impeller' },
    expect.objectContaining({ preserveScroll: true })
  )
})

test('without manage rights the cart button is absent', () => {
  const w = mountCard({ partKey: 'lower-unit.impeller', reference: KNOWN_REFERENCE }, false)
  expect(w.text()).not.toContain('parts.ai.addToCart')
})

test('a part without a known reference falls back on retailers and the assembly page', () => {
  const w = mountCard({ partKey: 'lower-unit.impeller', reference: null })

  expect(w.text()).toContain('parts.ai.resultNoReference')
  // Repli revendeurs de #517, marque couverte par le corpus → liens Yamaha.
  expect(w.text()).toContain('Partzilla')
  const assemblyLink = w
    .findAll('a')
    .find((a) => a.attributes('href') === '/boats/1/engines/2/spare-parts/assemblies/lower-unit')
  expect(assemblyLink).toBeDefined()
})

test('no matching catalog part sends back to manual identification', () => {
  const w = mountCard({ partKey: null, reference: null })

  expect(w.text()).toContain('parts.ai.resultNoMatch')
  const manualLink = w
    .findAll('a')
    .find((a) => a.attributes('href') === '/boats/1/engines/2/spare-parts')
  expect(manualLink).toBeDefined()
})
