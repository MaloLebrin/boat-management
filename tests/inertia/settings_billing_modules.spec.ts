import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

// `t` rend la clé suivie de ses paramètres : les assertions historiques
// portent sur la clé (`toContain`), et les montants formatés restent
// observables pour vérifier qu'ils passent bien par `formatPrice` (#612).
vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, vars?: Record<string, string>) =>
      vars ? `${k} ${Object.values(vars).join(' ')}` : k,
    locale: { value: 'fr' },
  }),
}))

const { post, del } = vi.hoisted(() => ({ post: vi.fn(), del: vi.fn() }))
vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return { ...actual, router: { post, delete: del } }
})

import SettingsBillingModules from '../../inertia/components/settings/SettingsBillingModules.vue'
import type { SubscriptionInfo } from '../../shared/types/billing'
import { MODULE_PRICES } from '../../shared/types/plan'
import { formatPrice } from '../../shared/helpers/number_format'

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

describe('dark mode (#416)', () => {
  test('les cartes de module utilisent bg-surface-muted, pas le token fantôme bg-surface-2', () => {
    // `bg-surface-2` n'existait dans aucune palette : il rendait transparent
    // dans les deux thèmes, ce qui ne se voyait que sur fond sombre.
    const html = mountModules({ plan: 'pro', subscription, activeModules: [] }).html()
    expect(html).toContain('bg-surface-muted')
    expect(html).not.toContain('surface-2')
  })

  test('« inclus dans le plan » utilise le token de succès, pas la palette green', () => {
    const html = mountModules({ plan: 'enterprise', subscription: null, activeModules: [] }).html()
    expect(html).toContain('text-success')
    expect(html).not.toMatch(/-green-\d/)
  })
})

describe('formatage du prix (#612)', () => {
  test('le prix mensuel du module passe par formatPrice', () => {
    const w = mountModules({ activeModules: [] })

    expect(w.text()).toContain(formatPrice(MODULE_PRICES.charter.monthly, 'fr'))
  })

  test('un abonnement annuel affiche le tarif annuel-équivalent du module', () => {
    const w = mountModules({
      subscription: { ...subscription, billingInterval: 'year' },
      activeModules: [],
    })

    expect(w.text()).toContain(formatPrice(MODULE_PRICES.charter.annualMonthly, 'fr'))
  })
})
