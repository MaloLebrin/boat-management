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

test('Enterprise shows every module as included, no action buttons', () => {
  const w = mountModules({ plan: 'enterprise', subscription: null, activeModules: [] })
  expect(w.text()).toContain('settings.billing.modules.included')
  expect(w.text()).not.toContain('settings.billing.modules.activate')
})

test('Starter (no subscription) prompts to upgrade to Pro', () => {
  const w = mountModules({ plan: 'starter', subscription: null, activeModules: [] })
  expect(w.text()).toContain('settings.billing.modules.proRequired')
  expect(w.text()).not.toContain('settings.billing.modules.activate')
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
