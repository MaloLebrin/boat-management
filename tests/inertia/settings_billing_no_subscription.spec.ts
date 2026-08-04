import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}|${JSON.stringify(params)}` : k,
    locale: { value: 'fr' },
  }),
}))

import SettingsBillingSubscriptionNotice from '../../inertia/components/settings/SettingsBillingSubscriptionNotice.vue'
import SettingsBillingFeatureList from '../../inertia/components/settings/SettingsBillingFeatureList.vue'
import type { QuotaUsage } from '../../shared/types/plan'

const quotaUsage: QuotaUsage = {
  boats: { used: 1, limit: 8 },
  members: { used: 1, limit: 5 },
  storage: { usedBytes: 0, limitBytes: 20 },
  aiTokens: { used: 0, limit: 1_000_000 },
  canUseAI: true,
  canExport: true,
}

function mountNotice(canManageBilling = true) {
  return mount(SettingsBillingSubscriptionNotice, {
    props: { plan: 'pro', canManageBilling },
    global: {
      stubs: {
        // Pas de `@click="$emit('click')"` : le listener `@click` du parent
        // retombe nativement sur le <button> stubbé — réémettre 'click' ferait
        // tirer l'action deux fois.
        BaseButton: { template: '<button><slot /></button>' },
      },
    },
  })
}

describe('bandeau « plan Pro sans abonnement actif » (#456)', () => {
  test("nomme le plan de l'organisation plutôt que de suggérer qu'elle ne l'a pas", () => {
    const text = mountNotice().text()
    expect(text).toContain('settings.billing.noSubscription.title')
    // Le plan est interpolé depuis `planName.pro` : le bandeau reconnaît le
    // plan Pro au lieu de demander de « l'activer ».
    expect(text).toContain('settings.billing.planName.pro')
  })

  test('un admin voit le CTA de finalisation', () => {
    const w = mountNotice(true)
    expect(w.text()).toContain('settings.billing.noSubscription.cta')
    expect(w.text()).not.toContain('settings.billing.noSubscription.adminOnly')
  })

  test('émet activateSubscription au clic', async () => {
    const w = mountNotice(true)
    await w.find('button').trigger('click')
    expect(w.emitted('activateSubscription')).toHaveLength(1)
  })

  test('sans capability billing, aucun CTA — seulement le renvoi vers un admin', () => {
    const w = mountNotice(false)
    expect(w.find('button').exists()).toBe(false)
    expect(w.text()).toContain('settings.billing.noSubscription.adminOnly')
  })
})

describe('liste des capacités du plan (#456)', () => {
  function mountList(plan: 'starter' | 'pro' | 'enterprise') {
    return mount(SettingsBillingFeatureList, { props: { plan, quotaUsage } })
  }

  test('Pro distingue « IA / Copilote » (coché) de « Personnalisation IA » (non coché)', () => {
    const items = mountList('pro').findAll('li')
    const ai = items.find((li) => li.text().includes('features.ai|'))
    const custom = items.find((li) => li.text().includes('features.aiCustomization'))

    expect(ai ?? items.find((li) => li.text().includes('features.ai'))).toBeTruthy()
    expect(custom).toBeTruthy()
    // La personnalisation est Entreprise-only : elle doit apparaître décochée,
    // sinon la carte laisse croire que /settings/ai est accessible.
    expect(custom!.text()).toContain('✗')
  })

  test('Enterprise coche la personnalisation IA', () => {
    const custom = mountList('enterprise')
      .findAll('li')
      .find((li) => li.text().includes('features.aiCustomization'))
    expect(custom!.text()).toContain('✓')
  })

  test('Starter décoche la personnalisation IA', () => {
    const custom = mountList('starter')
      .findAll('li')
      .find((li) => li.text().includes('features.aiCustomization'))
    expect(custom!.text()).toContain('✗')
  })
})
