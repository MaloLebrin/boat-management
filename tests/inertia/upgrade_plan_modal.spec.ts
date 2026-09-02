import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

// `t` rend la clé suivie de ses paramètres, pour observer le montant formaté.
vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, vars?: Record<string, string>) =>
      vars ? `${k} ${Object.values(vars).join(' ')}` : k,
    locale: { value: 'fr' },
  }),
}))

const currentPlan = vi.hoisted(() => ({ value: 'pro' as string }))
vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    usePage: () => ({ props: { currentPlan: currentPlan.value, locale: 'fr' } }),
    useForm: () => ({ processing: false, transform: () => ({ post: vi.fn() }) }),
  }
})

import UpgradePlanModal from '../../inertia/components/base/UpgradePlanModal.vue'
import { PLAN_PRICES } from '../../shared/types/plan'
import { formatPrice } from '../../shared/helpers/number_format'

function mountModal() {
  return mount(UpgradePlanModal, {
    props: { open: true, feature: 'boats' as const },
    global: {
      stubs: {
        BaseModal: { template: '<div><slot /><slot name="footer" /></div>' },
        BaseButton: { template: '<button><slot /></button>' },
      },
    },
  })
}

// #612 — la modale collait un « € » en dur à droite du nombre, quelle que soit
// la locale, alors que `formatPrice` existe justement pour placer le symbole.
test('the target plan price goes through formatPrice', () => {
  const w = mountModal()

  expect(w.text()).toContain(formatPrice(PLAN_PRICES.enterprise.monthly, 'fr'))
})

test('the annual note shows the total Stripe actually charges', async () => {
  const w = mountModal()
  const year = w.findAll('button').find((b) => b.text().includes('interval.year'))!
  await year.trigger('click')

  // `annualTotal` est le montant facturé, pas douze fois le mensuel-équivalent
  // arrondi affiché juste au-dessus (79 € × 12 = 948, Stripe facture 950).
  expect(w.text()).toContain(formatPrice(PLAN_PRICES.enterprise.annualTotal, 'fr'))
})

test('a starter org is offered the Pro price', () => {
  currentPlan.value = 'starter'
  const w = mountModal()

  expect(w.text()).toContain(formatPrice(PLAN_PRICES.pro.monthly, 'fr'))
  currentPlan.value = 'pro'
})
