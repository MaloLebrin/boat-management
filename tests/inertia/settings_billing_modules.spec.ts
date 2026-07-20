import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

const { post, del } = vi.hoisted(() => ({ post: vi.fn(), del: vi.fn() }))
vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return { ...actual, router: { post, delete: del } }
})

import SettingsBillingModules from '../../inertia/components/settings/SettingsBillingModules.vue'
import type { SubscriptionInfo } from '../../shared/types/billing'

const subscription: SubscriptionInfo = {
  id: 1,
  status: 'active',
  planTier: 'pro',
  billingInterval: 'month',
  currentPeriodEnd: '2030-01-01',
  cancelAtPeriodEnd: false,
}

function mountModules(props: Partial<InstanceType<typeof SettingsBillingModules>['$props']> = {}) {
  return mount(SettingsBillingModules, {
    props: {
      plan: 'pro',
      subscription,
      activeModules: [],
      canManageBilling: true,
      ...props,
    },
    global: {
      stubs: {
        BaseCard: { template: '<div><slot name="header" /><slot /></div>' },
        BaseButton: {
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  })
}

test('a subscribed Pro org sees an activate button for an inactive module', () => {
  const w = mountModules({ plan: 'pro', subscription, activeModules: [] })
  expect(w.text()).toContain('settings.billing.modules.activate')
  expect(w.text()).not.toContain('settings.billing.modules.deactivate')
})

test('an active subscription module shows a deactivate button', () => {
  const w = mountModules({
    activeModules: [{ module: 'charter', source: 'subscription' }],
  })
  expect(w.text()).toContain('settings.billing.modules.deactivate')
})

test('a granted module shows the offered hint and no deactivate button', () => {
  const w = mountModules({
    activeModules: [{ module: 'charter', source: 'granted' }],
  })
  expect(w.text()).toContain('settings.billing.modules.grantedHint')
  expect(w.text()).toContain('settings.billing.modules.granted')
})

test('Enterprise shows every module as included, with no CTA, whether or not it is granted (#402)', () => {
  const w = mountModules({ plan: 'enterprise', subscription: null, activeModules: [] })
  expect(w.text()).toContain('settings.billing.modules.includedInPlan')
  expect(w.text()).not.toContain('settings.billing.modules.activate')
  expect(w.text()).not.toContain('settings.billing.modules.deactivateIncluded')
  expect(w.find('button').exists()).toBe(false)
})

test('Enterprise still shows every module as included when a module is explicitly granted (#402)', () => {
  const w = mountModules({
    plan: 'enterprise',
    subscription: null,
    activeModules: [{ module: 'charter', source: 'granted' }],
  })
  expect(w.text()).toContain('settings.billing.modules.includedInPlan')
  expect(w.find('button').exists()).toBe(false)
})

test('Enterprise without subscription.manage still shows every module as included (#402)', () => {
  const w = mountModules({
    plan: 'enterprise',
    subscription: null,
    activeModules: [],
    canManageBilling: false,
  })
  expect(w.text()).toContain('settings.billing.modules.includedInPlan')
  expect(w.text()).not.toContain('settings.billing.modules.adminOnly')
})

test('Starter (no subscription) prompts to upgrade to Pro', () => {
  const w = mountModules({ plan: 'starter', subscription: null, activeModules: [] })
  expect(w.text()).toContain('settings.billing.modules.proRequired')
  expect(w.text()).not.toContain('settings.billing.modules.activate')
})

test('a Pro org without an active subscription is invited to activate it first, not told to upgrade (#402)', () => {
  const w = mountModules({ plan: 'pro', subscription: null, activeModules: [] })
  expect(w.text()).toContain('settings.billing.modules.activateSubscription')
  expect(w.text()).not.toContain('settings.billing.modules.proRequired')
})

test('a Pro org without an active subscription and without subscription.manage sees an informational message only', () => {
  const w = mountModules({
    plan: 'pro',
    subscription: null,
    activeModules: [],
    canManageBilling: false,
  })
  expect(w.text()).toContain('settings.billing.modules.subscriptionRequired')
  expect(w.find('button').exists()).toBe(false)
})

test('clicking the activate-subscription CTA emits activateSubscription', async () => {
  const w = mountModules({ plan: 'pro', subscription: null, activeModules: [] })
  await w.find('button').trigger('click')
  expect(w.emitted('activateSubscription')).toBeTruthy()
})

test('clicking activate posts to the module endpoint', async () => {
  post.mockClear()
  const w = mountModules({ activeModules: [] })
  await w.find('button').trigger('click')
  expect(post).toHaveBeenCalledWith(
    '/settings/billing/module',
    { module: 'charter' },
    { preserveScroll: true }
  )
})

test('clicking deactivate deletes on the module endpoint', async () => {
  del.mockClear()
  const w = mountModules({ activeModules: [{ module: 'charter', source: 'subscription' }] })
  await w.find('button').trigger('click')
  expect(del).toHaveBeenCalledWith('/settings/billing/module', {
    data: { module: 'charter' },
    preserveScroll: true,
  })
})

// subscription.manage gating (#397) — a member has subscription.view but not
// subscription.manage: the activate/deactivate CTAs must not be actionable.

test('a subscribed Pro org without subscription.manage sees no activate button', () => {
  const w = mountModules({ plan: 'pro', subscription, activeModules: [], canManageBilling: false })
  expect(w.text()).not.toContain('settings.billing.modules.activate')
  expect(w.text()).toContain('settings.billing.modules.adminOnly')
})
