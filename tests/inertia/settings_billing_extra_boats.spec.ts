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

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return { ...actual, router: { post } }
})

import SettingsBillingExtraBoats from '../../inertia/components/settings/SettingsBillingExtraBoats.vue'
import type { SubscriptionInfo } from '../../shared/types/billing'
import { ADDON_PRICES } from '../../shared/types/plan'
import { formatPrice } from '../../shared/helpers/number_format'

const subscription: SubscriptionInfo = {
  id: 1,
  status: 'active',
  planTier: 'pro',
  billingInterval: 'month',
  currentPeriodEnd: '2030-01-01',
  cancelAtPeriodEnd: false,
}

function mountExtraBoats(
  props: Partial<InstanceType<typeof SettingsBillingExtraBoats>['$props']> = {}
) {
  return mount(SettingsBillingExtraBoats, {
    props: {
      plan: 'pro',
      subscription,
      activeAddons: [],
      canManageBilling: true,
      ...props,
    },
    global: {
      stubs: {
        BaseCard: { template: '<div><slot name="header" /><slot /></div>' },
        // Pas de `@click="$emit('click')"` : le listener `@click` du parent
        // retombe nativement sur le <button> stubbé. Réémettre 'click' le
        // ferait tirer deux fois (bug classique event natif + emit homonyme),
        // ce qui doublerait chaque incrément du stepper.
        BaseButton: {
          template: '<button :disabled="disabled"><slot /></button>',
          props: ['disabled'],
        },
      },
    },
  })
}

test('a subscribed Pro org sees the stepper starting at the current quantity', () => {
  const w = mountExtraBoats({
    activeAddons: [{ addon: 'extra_boats', quantity: 3, source: 'subscription' }],
  })
  expect(w.find('[data-testid="extra-boats-quantity"]').text()).toBe('3')
})

test('incrementing then applying posts the new quantity to the addon endpoint', async () => {
  post.mockClear()
  const w = mountExtraBoats({ activeAddons: [] })
  const buttons = w.findAll('button')
  const increment = buttons.find((b) => b.attributes('aria-label') === 'increment')!
  await increment.trigger('click')
  await increment.trigger('click')
  expect(w.find('[data-testid="extra-boats-quantity"]').text()).toBe('2')

  const apply = w
    .findAll('button')
    .find((b) => b.text().includes('settings.billing.extraBoats.apply'))!
  await apply.trigger('click')

  expect(post).toHaveBeenCalledWith(
    '/settings/billing/addon',
    { addon: 'extra_boats', quantity: 2 },
    { preserveScroll: true }
  )
})

test('the apply button is disabled while the quantity is unchanged', () => {
  const w = mountExtraBoats({
    activeAddons: [{ addon: 'extra_boats', quantity: 2, source: 'subscription' }],
  })
  const apply = w
    .findAll('button')
    .find((b) => b.text().includes('settings.billing.extraBoats.apply'))!
  expect(apply.attributes('disabled')).toBeDefined()
})

test('a granted add-on shows the offered hint and no stepper', () => {
  const w = mountExtraBoats({
    activeAddons: [{ addon: 'extra_boats', quantity: 4, source: 'granted' }],
  })
  expect(w.text()).toContain('settings.billing.extraBoats.grantedHint')
  expect(w.find('[data-testid="extra-boats-quantity"]').exists()).toBe(false)
})

test('Enterprise shows the unlimited badge, no stepper', () => {
  const w = mountExtraBoats({ plan: 'enterprise', subscription: null, activeAddons: [] })
  expect(w.text()).toContain('settings.billing.extraBoats.unlimited')
  expect(w.find('[data-testid="extra-boats-quantity"]').exists()).toBe(false)
})

test('Starter (no subscription) prompts to upgrade to Pro', () => {
  const w = mountExtraBoats({ plan: 'starter', subscription: null, activeAddons: [] })
  expect(w.text()).toContain('settings.billing.extraBoats.proRequired')
})

describe('plan Pro sans abonnement Stripe actif (#456)', () => {
  test("un admin se voit proposer de finaliser l'abonnement, pas d'exiger un plan Pro", () => {
    const w = mountExtraBoats({ plan: 'pro', subscription: null, activeAddons: [] })
    expect(w.text()).toContain('settings.billing.noSubscription.cta')
    expect(w.text()).not.toContain('settings.billing.extraBoats.proRequired')
  })

  test("émet activateSubscription au clic, plutôt que d'appeler l'endpoint add-on", async () => {
    post.mockClear()
    const w = mountExtraBoats({ plan: 'pro', subscription: null, activeAddons: [] })
    await w.findAll('button')[0].trigger('click')
    expect(w.emitted('activateSubscription')).toHaveLength(1)
    expect(post).not.toHaveBeenCalled()
  })

  test('sans capability billing, le message renvoie vers un administrateur', () => {
    const w = mountExtraBoats({
      plan: 'pro',
      subscription: null,
      activeAddons: [],
      canManageBilling: false,
    })
    expect(w.text()).toContain('settings.billing.extraBoats.subscriptionRequired')
    expect(w.text()).not.toContain('settings.billing.extraBoats.proRequired')
  })
})

describe('dark mode (#416)', () => {
  test('le panneau utilise bg-surface-muted, pas le token fantôme bg-surface-2', () => {
    const html = mountExtraBoats({ plan: 'pro', subscription: null, activeAddons: [] }).html()
    expect(html).toContain('bg-surface-muted')
    expect(html).not.toContain('surface-2')
  })
})

describe('formatage du prix (#612)', () => {
  test('le prix unitaire passe par formatPrice, sans « € » collé dans la clé', () => {
    const w = mountExtraBoats({
      activeAddons: [{ addon: 'extra_boats', quantity: 2, source: 'subscription' }],
    })

    expect(w.text()).toContain(formatPrice(ADDON_PRICES.extra_boats.monthly, 'fr'))
    expect(w.text()).toContain(formatPrice(2 * ADDON_PRICES.extra_boats.monthly, 'fr'))
  })

  test("un abonnement annuel affiche le tarif annuel-équivalent de l'add-on", () => {
    const w = mountExtraBoats({
      subscription: { ...subscription, billingInterval: 'year' },
      activeAddons: [{ addon: 'extra_boats', quantity: 1, source: 'subscription' }],
    })

    expect(w.text()).toContain(formatPrice(ADDON_PRICES.extra_boats.annualMonthly, 'fr'))
  })
})
