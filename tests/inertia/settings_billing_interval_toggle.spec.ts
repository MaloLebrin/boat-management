import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

import SettingsBillingIntervalToggle from '../../inertia/components/settings/SettingsBillingIntervalToggle.vue'

// #955 — toggle mensuel / annuel extrait de l'onglet et de la modale.
test('marks the active interval and shows the annual discount badge', () => {
  const w = mount(SettingsBillingIntervalToggle, { props: { interval: 'year' } })
  const [month, year] = w.findAll('button')

  expect(month.attributes('aria-pressed')).toBe('false')
  expect(year.attributes('aria-pressed')).toBe('true')
  expect(year.text()).toContain('settings.billing.subscription.annualDiscount')
})

test('clicking an interval emits update:interval', async () => {
  const w = mount(SettingsBillingIntervalToggle, { props: { interval: 'month' } })
  await w.findAll('button')[1].trigger('click')
  await w.findAll('button')[0].trigger('click')

  expect(w.emitted('update:interval')).toEqual([['year'], ['month']])
})
