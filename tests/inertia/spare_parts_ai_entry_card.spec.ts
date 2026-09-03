import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import type { SparePartsEngineRow } from '../../shared/types/spare_parts'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

const routerVisit = vi.fn()
let currentPlan = 'pro'

vi.mock('@inertiajs/vue3', () => ({
  router: { visit: (...args: unknown[]) => routerVisit(...args) },
  usePage: () => ({
    props: {
      get currentPlan() {
        return currentPlan
      },
    },
  }),
}))

import SparePartsAiEntryCard from '../../inertia/components/spare_parts/chat/SparePartsAiEntryCard.vue'

const ENGINES: SparePartsEngineRow[] = [
  {
    id: 2,
    boatId: 1,
    boatName: 'Pen Duick',
    brand: 'Yamaha',
    model: '4AS',
    serialNumber: '6E0-S-123456',
    kind: 'outboard',
    family: 'outboard_2t',
    status: 'operational',
    cartCount: 0,
  },
  {
    id: 5,
    boatId: 3,
    boatName: 'Tara',
    brand: 'Volvo Penta',
    model: 'D2-40',
    serialNumber: null,
    kind: 'inboard',
    family: 'inboard_diesel_shaft',
    status: 'operational',
    cartCount: 2,
  },
]

function mountCard(props: Record<string, unknown>) {
  return mount(SparePartsAiEntryCard, {
    props,
    global: { stubs: { UpgradePlanModal: true } },
  })
}

test('direct mode navigates to the engine chat on a plan with AI', async () => {
  currentPlan = 'pro'
  routerVisit.mockClear()
  const w = mountCard({ boatId: 1, engineId: 2 })

  await w.find('button').trigger('click')
  expect(routerVisit).toHaveBeenCalledWith('/boats/1/engines/2/spare-parts/chat')
})

test('on a starter plan the upgrade modal opens and nothing navigates', async () => {
  currentPlan = 'starter'
  routerVisit.mockClear()
  const w = mountCard({ boatId: 1, engineId: 2 })

  await w.find('button').trigger('click')
  expect(routerVisit).not.toHaveBeenCalled()
  expect(w.findComponent({ name: 'UpgradePlanModal' }).attributes('open')).toBe('true')
  currentPlan = 'pro'
})

test('selector mode lists the fleet engines and navigates to the chosen one', async () => {
  currentPlan = 'pro'
  routerVisit.mockClear()
  const w = mountCard({ engines: ENGINES })

  const options = w.findAll('option')
  expect(options).toHaveLength(2)
  expect(options[0].text()).toContain('Pen Duick')

  // `setValue` attend la valeur DOM (string) : un nombre désélectionne tout sous happy-dom.
  await w.find('select').setValue('5')
  await w.find('button').trigger('click')
  expect(routerVisit).toHaveBeenCalledWith('/boats/3/engines/5/spare-parts/chat')
})
