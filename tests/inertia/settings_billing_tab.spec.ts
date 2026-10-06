import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDateLong: (d: string) => d }),
}))

const { capabilities } = vi.hoisted(() => ({ capabilities: { value: [] as string[] } }))
vi.mock('~/composables/use_permissions', () => ({
  usePermissions: () => ({ can: (c: string) => capabilities.value.includes(c) }),
}))

// `useForm` factice : `transform` capture le callback pour observer le payload
// réellement posté, `post` enregistre l'URL et ses options (#955).
const { post, formState } = vi.hoisted(() => ({
  post: vi.fn(),
  formState: { promoCode: '', errors: {} as Record<string, string> },
}))
vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    useForm: (initial: Record<string, unknown>) => {
      if (!('promoCode' in initial)) return { processing: false, post: vi.fn() }
      let transformFn: (data: typeof formState) => unknown = (d) => d
      const form = {
        processing: false,
        get promoCode() {
          return formState.promoCode
        },
        set promoCode(v: string) {
          formState.promoCode = v
        },
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

import SettingsBillingTab from '../../inertia/components/settings/tabs/SettingsBillingTab.vue'
import type { SubscriptionInfo } from '../../shared/types/billing'
import type { QuotaUsage } from '../../shared/types/plan'

const quotaUsage: QuotaUsage = {
  boats: { used: 1, limit: 3 },
  members: { used: 1, limit: 3 },
  storage: { usedBytes: 0, limitBytes: 1000 },
  aiTokens: { used: 0, limit: 0 },
  canUseAI: false,
  canExport: false,
}

const subscription: SubscriptionInfo = {
  id: 1,
  status: 'active',
  planTier: 'pro',
  billingInterval: 'month',
  currentPeriodEnd: '2030-01-01',
  cancelAtPeriodEnd: false,
  discount: null,
}

function mountTab(props: { plan: 'starter' | 'pro'; subscription: SubscriptionInfo | null }) {
  return mount(SettingsBillingTab, {
    props: { ...props, quotaUsage, orgModules: [], orgAddons: [] },
    global: {
      stubs: {
        BaseCard: { template: '<div><slot name="header" /><slot /><slot name="footer" /></div>' },
        BaseButton: { template: '<button><slot /></button>' },
        SettingsBillingUsageGauge: true,
        SettingsBillingFeatureList: true,
        SettingsBillingModules: true,
        SettingsBillingExtraBoats: true,
        SettingsBillingSubscriptionNotice: true,
        SettingsBillingDiscountLine: {
          props: ['discount'],
          template: '<div data-test="discount">{{ discount.promoCode }}</div>',
        },
      },
    },
  })
}

// #843 : le portail Stripe et le checkout sont réservés à `subscription.manage`.
test('an admin sees the portal button on a subscribed org', () => {
  capabilities.value = ['subscription.manage']
  const w = mountTab({ plan: 'pro', subscription })
  expect(w.text()).toContain('settings.billing.subscription.manage')
  expect(w.text()).not.toContain('settings.billing.subscription.adminOnly')
})

test('an admin sees the upgrade button on an unsubscribed org', () => {
  capabilities.value = ['subscription.manage']
  const w = mountTab({ plan: 'starter', subscription: null })
  expect(w.text()).toContain('settings.billing.upgradeTo.pro')
})

test('a non-admin sees neither the portal nor the upgrade button', () => {
  capabilities.value = []
  for (const props of [
    { plan: 'pro' as const, subscription },
    { plan: 'starter' as const, subscription: null },
  ]) {
    const w = mountTab(props)
    expect(w.text()).not.toContain('settings.billing.subscription.manage')
    expect(w.text()).not.toContain('settings.billing.upgradeTo.pro')
    expect(w.text()).toContain('settings.billing.subscription.adminOnly')
  }
})

// #955 — code promo au checkout et remise affichée.
test('an admin on an unsubscribed org sees the promo code field, a subscribed one does not', () => {
  capabilities.value = ['subscription.manage']
  expect(mountTab({ plan: 'starter', subscription: null }).find('input#promoCode').exists()).toBe(
    true
  )
  expect(mountTab({ plan: 'pro', subscription }).find('input#promoCode').exists()).toBe(false)
})

test('the checkout posts the promo code only when one was typed, preserving state', async () => {
  capabilities.value = ['subscription.manage']
  post.mockClear()
  formState.promoCode = ''
  const w = mountTab({ plan: 'starter', subscription: null })
  const upgrade = w.findAll('button').find((b) => b.text().includes('upgradeTo.pro'))!

  await upgrade.trigger('click')
  expect(post).toHaveBeenLastCalledWith(
    '/settings/billing/checkout',
    { planTier: 'pro', interval: 'month' },
    { preserveState: true, preserveScroll: true }
  )

  await w.find('input#promoCode').setValue('BIENVENUE20')
  await upgrade.trigger('click')
  expect(post).toHaveBeenLastCalledWith(
    '/settings/billing/checkout',
    { planTier: 'pro', interval: 'month', promoCode: 'BIENVENUE20' },
    { preserveState: true, preserveScroll: true }
  )
})

test('the active discount is shown with the subscription', () => {
  capabilities.value = []
  const discounted: SubscriptionInfo = {
    ...subscription,
    discount: {
      couponId: 'coupon_asso',
      promoCode: 'ASSO50',
      name: 'Associations',
      percentOff: 50,
      amountOffCents: null,
      currency: null,
      duration: 'forever',
      durationInMonths: null,
      end: null,
    },
  }

  expect(
    mountTab({ plan: 'pro', subscription: discounted }).find('[data-test="discount"]').text()
  ).toBe('ASSO50')
  expect(mountTab({ plan: 'pro', subscription }).find('[data-test="discount"]').exists()).toBe(
    false
  )
})
