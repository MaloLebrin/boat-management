import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

// `t` rend la clé suivie de ses paramètres, pour observer les valeurs formatées.
vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, vars?: Record<string, string>) =>
      vars ? `${k} ${Object.values(vars).join(' ')}` : k,
    locale: { value: 'fr' },
  }),
}))
vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDateLong: (d: string) => `long(${d})` }),
}))
vi.mock('~/composables/use_number_format', () => ({
  useNumberFormat: () => ({
    formatNumber: (v: number, o?: Intl.NumberFormatOptions) =>
      o?.style === 'percent' ? `${v * 100}%` : String(v),
    formatCurrency: (v: number, o?: { currency?: string }) => `${v} ${o?.currency ?? 'EUR'}`,
  }),
}))

import SettingsBillingDiscountLine from '../../inertia/components/settings/SettingsBillingDiscountLine.vue'
import type { SubscriptionDiscountInfo } from '../../shared/types/billing'

const base: SubscriptionDiscountInfo = {
  couponId: 'coupon_test',
  promoCode: 'ASSO50',
  name: 'Associations',
  percentOff: 50,
  amountOffCents: null,
  currency: null,
  duration: 'forever',
  durationInMonths: null,
  end: null,
}

function mountLine(
  discount: Partial<SubscriptionDiscountInfo>,
  billingInterval = 'month' as const
) {
  return mount(SettingsBillingDiscountLine, {
    props: { discount: { ...base, ...discount }, billingInterval },
  })
}

// #955 — la remise active s'affiche sous le bloc d'abonnement.
test('a percent coupon for life shows the percentage, "for life" and the code', () => {
  const text = mountLine({}).text()

  expect(text).toContain('settings.billing.discount.label')
  expect(text).toContain('settings.billing.discount.percentOff 50%')
  expect(text).toContain('settings.billing.discount.forever')
  expect(text).toContain('settings.billing.discount.code ASSO50')
})

test('an amount coupon is formatted in its currency, per billing interval', () => {
  const text = mountLine(
    { percentOff: null, amountOffCents: 1000, currency: 'eur', duration: 'once' },
    'year'
  ).text()

  expect(text).toContain('settings.billing.discount.amountOff.year 10 eur')
  expect(text).toContain('settings.billing.discount.once')
})

test('a repeating coupon shows its end date when known, else its month count', () => {
  const withEnd = mountLine({ duration: 'repeating', durationInMonths: 12, end: '2027-03-12' })
  expect(withEnd.text()).toContain('settings.billing.discount.until long(2027-03-12)')
  expect(withEnd.text()).not.toContain('settings.billing.discount.months')

  const withoutEnd = mountLine({ duration: 'repeating', durationInMonths: 3, end: null })
  expect(withoutEnd.text()).toContain('settings.billing.discount.months 3')
})

test('a coupon applied without a promo code shows no code', () => {
  expect(mountLine({ promoCode: null }).text()).not.toContain('settings.billing.discount.code')
})

test('a coupon with neither percentage nor amount renders no empty amount label', () => {
  const w = mountLine({ percentOff: null, amountOffCents: null, currency: null })

  expect(w.find('span.text-success').exists()).toBe(false)
  expect(w.text()).toContain('settings.billing.discount.label')
})
