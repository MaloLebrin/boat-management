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
