import { mount } from '@vue/test-utils'
import { afterEach, expect, test, vi } from 'vitest'

// `t` rend la clé suivie de ses paramètres, pour observer le montant formaté.
vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, vars?: Record<string, string>) =>
      vars ? `${k} ${Object.values(vars).join(' ')}` : k,
    locale: { value: 'fr' },
  }),
}))

const { currentPlan, post, reset, clearErrors, formState } = vi.hoisted(() => ({
  currentPlan: { value: 'pro' as string },
  post: vi.fn(),
  reset: vi.fn(),
  clearErrors: vi.fn(),
  formState: { promoCode: '', errors: {} as Record<string, string> },
}))
vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  // État réactif : la modale observe `promoCode` pour effacer l'ancienne erreur.
  const { reactive } = await vi.importActual<typeof import('vue')>('vue')
  const state = reactive(formState)
  return {
    ...actual,
    usePage: () => ({ props: { currentPlan: currentPlan.value, locale: 'fr' } }),
    // `transform` capture le callback pour observer le payload posté (#955).
    useForm: () => {
      let transformFn: (data: typeof formState) => unknown = (d) => d
      const form = {
        processing: false,
        get promoCode() {
          return state.promoCode
        },
        set promoCode(v: string) {
          state.promoCode = v
        },
        reset() {
          state.promoCode = ''
          reset()
        },
        clearErrors: (...fields: string[]) => clearErrors(...fields),
        errors: formState.errors,
        transform(fn: (data: typeof formState) => unknown) {
          transformFn = fn
          return form
        },
        post(url: string, options?: Record<string, unknown>) {
          post(url, transformFn(formState), options)
        },
      }
      return form
    },
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

afterEach(() => {
  currentPlan.value = 'pro'
})

test('a starter org is offered the Pro price', () => {
  currentPlan.value = 'starter'
  const w = mountModal()

  expect(w.text()).toContain(formatPrice(PLAN_PRICES.pro.monthly, 'fr'))
})

// #955 — la modale reste montée quand elle se ferme : code, erreur et intervalle
// d'un essai précédent ne doivent pas réapparaître à la réouverture.
test('closing the modal forgets the typed code, its error and the chosen interval', async () => {
  reset.mockClear()
  clearErrors.mockClear()
  const w = mountModal()
  await w.find('input#promoCode').setValue('BADCODE')
  const year = w.findAll('button').find((b) => b.text().includes('interval.year'))!
  await year.trigger('click')
  expect(w.text()).toContain('settings.upgrade.priceAnnual')

  await w.setProps({ open: false })
  expect(reset).toHaveBeenCalledOnce()
  expect(clearErrors).toHaveBeenCalledWith()

  await w.setProps({ open: true })
  expect((w.find('input#promoCode').element as HTMLInputElement).value).toBe('')
  expect(w.text()).not.toContain('settings.upgrade.priceAnnual')
})

test('retyping the code clears the error of the previous attempt', async () => {
  const w = mountModal()
  clearErrors.mockClear()

  await w.find('input#promoCode').setValue('AUTRE')

  expect(clearErrors).toHaveBeenCalledWith('promoCode')
})

// #955 — le code promo saisi dans la modale part avec le checkout.
test('the checkout posts the promo code only when typed, preserving the modal state', async () => {
  post.mockClear()
  formState.promoCode = ''
  const w = mountModal()
  const upgrade = w.findAll('button').find((b) => b.text().includes('upgradeTo.enterprise'))!

  await upgrade.trigger('click')
  expect(post).toHaveBeenLastCalledWith(
    '/settings/billing/checkout',
    { planTier: 'enterprise', interval: 'month' },
    { preserveState: true, preserveScroll: true }
  )

  await w.find('input#promoCode').setValue('vip')
  await upgrade.trigger('click')
  expect(post).toHaveBeenLastCalledWith(
    '/settings/billing/checkout',
    { planTier: 'enterprise', interval: 'month', promoCode: 'vip' },
    { preserveState: true, preserveScroll: true }
  )
})
