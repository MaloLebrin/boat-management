import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

import SettingsBillingPromoCodeField from '../../inertia/components/settings/SettingsBillingPromoCodeField.vue'

// #955 — champ « Code promo » partagé par l'onglet Facturation et la modale.
test('renders the label, hint and placeholder through t()', () => {
  const w = mount(SettingsBillingPromoCodeField, { props: { modelValue: '' } })

  expect(w.text()).toContain('settings.billing.promoCode.label')
  expect(w.text()).toContain('settings.billing.promoCode.hint')
  expect(w.find('input').attributes('placeholder')).toBe('settings.billing.promoCode.placeholder')
  expect(w.find('input').attributes('autocomplete')).toBe('off')
})

test('emits the trimmed value', async () => {
  const w = mount(SettingsBillingPromoCodeField, { props: { modelValue: '' } })
  await w.find('input').setValue('  bienvenue20 ')

  expect(w.emitted('update:modelValue')).toEqual([['bienvenue20']])
})

test('shows the server error under the field and hides the hint', () => {
  const w = mount(SettingsBillingPromoCodeField, {
    props: { modelValue: 'NOPE', errors: { promoCode: 'Ce code promo est inconnu.' } },
  })

  expect(w.text()).toContain('Ce code promo est inconnu.')
  expect(w.text()).not.toContain('settings.billing.promoCode.hint')
  expect(w.find('input').attributes('aria-invalid')).toBe('true')
})
