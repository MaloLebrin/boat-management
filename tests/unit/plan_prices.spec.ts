import { test } from '@japa/runner'
import {
  ADDON_PRICES,
  MODULE_PRICES,
  PLAN_ADDONS,
  PLAN_MODULES,
  PLAN_PRICES,
} from '#shared/types/plan'
import type { PlanPrice } from '#shared/types/plan'

/**
 * Invariants des barèmes tarifaires (#612).
 *
 * Les trois barèmes — socles, modules et add-ons quantitatifs — sont la source
 * de vérité affichée sur la page Tarifs, dans `/settings/billing` et dans la
 * modale d'upgrade. Un `annualTotal` qui ne retombe pas sur douze mensualités
 * annonce à l'utilisateur un montant que Stripe ne facturera pas : c'est ce qui
 * était arrivé à Entreprise (950 € annoncés pour 79 × 12 = 948).
 */
const paidPrices = (): Array<[string, PlanPrice]> => [
  ['plan pro', PLAN_PRICES.pro],
  ['plan enterprise', PLAN_PRICES.enterprise],
  ...PLAN_MODULES.map((m): [string, PlanPrice] => [`module ${m}`, MODULE_PRICES[m]]),
  ...PLAN_ADDONS.map((a): [string, PlanPrice] => [`addon ${a}`, ADDON_PRICES[a]]),
]

test.group('Plan pricing invariants', () => {
  test('the displayed monthly equivalent is the annual total spread over twelve', ({ assert }) => {
    for (const [label, price] of [
      ...paidPrices(),
      ['plan starter', PLAN_PRICES.starter] as const,
    ]) {
      // `annualTotal` est ce que Stripe facture, `annualMonthly` ce que la page
      // tarifs affiche : le second doit être le premier divisé par douze, à
      // l'arrondi près. Un `annualTotal` saisi à la main hors de cette fenêtre
      // annonce à l'utilisateur un montant que Stripe ne prélèvera pas.
      assert.equal(
        price.annualMonthly,
        Math.round(price.annualTotal / 12),
        `${label}: annualMonthly must be annualTotal ÷ 12, rounded to the euro`
      )
    }
  })

  test('annual billing discounts at least the 20% announced everywhere', ({ assert }) => {
    for (const [label, price] of paidPrices()) {
      assert.isAtMost(
        price.annualMonthly,
        price.monthly * 0.8,
        `${label}: annual billing advertises −20%, it may give more but never less`
      )
    }
  })

  test('starter is free on every interval', ({ assert }) => {
    assert.deepEqual(PLAN_PRICES.starter, { monthly: 0, annualMonthly: 0, annualTotal: 0 })
  })

  test('tiers are priced in ascending order', ({ assert }) => {
    assert.isBelow(PLAN_PRICES.starter.monthly, PLAN_PRICES.pro.monthly)
    assert.isBelow(PLAN_PRICES.pro.monthly, PLAN_PRICES.enterprise.monthly)
  })
})
