import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return { ...actual, router: { post } }
})

import SettingsBillingExtraBoats from '../../inertia/components/settings/SettingsBillingExtraBoats.vue'
import type { SubscriptionInfo } from '../../shared/types/billing'

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
