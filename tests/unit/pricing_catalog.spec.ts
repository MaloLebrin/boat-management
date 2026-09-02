import { test } from '@japa/runner'
import PricingCatalogService from '#services/pricing_catalog_service'
import type StripeService from '#services/stripe_service'
import {
  ADDON_PRICES,
  MODULE_PRICES,
  PLAN_ADDONS,
  PLAN_MODULES,
  PLAN_PRICES,
} from '#shared/types/plan'

type StripePriceStub = {
  active?: boolean
  currency?: string
  unit_amount?: number | null
  recurring?: { interval?: string } | null
}

/**
 * `StripeService` réduit à la seule lecture de prix : la commande `pricing:check`
 * ne fait rien d'autre, et un vrai client Stripe rendrait le test dépendant du
 * réseau et d'un compte.
 */
function fakeStripe(prices: Record<string, StripePriceStub | Error>): StripeService {
  return {
    async retrievePrice(priceId: string) {
      const price = prices[priceId]
      if (price instanceof Error) throw price
      if (!price) throw new Error(`No such price: ${priceId}`)
      return { active: true, currency: 'eur', recurring: { interval: 'month' }, ...price }
    },
  } as unknown as StripeService
}

test.group('PricingCatalogService — barème attendu', () => {
  test('couvre chaque tier payant, module et add-on sur les deux intervalles', ({ assert }) => {
    const rows = new PricingCatalogService(fakeStripe({})).expectedPrices()
    const labels = rows.map((r) => r.label)

    // La table du service est écrite à la main pour rester typée sur le schéma
    // d'env : ce test est ce qui garantit qu'un module ou un add-on ajouté au
    // barème n'y soit pas oublié — et donc jamais confronté à Stripe.
    for (const label of ['pro', 'enterprise']) {
      assert.includeMembers(labels, [`${label} / month`, `${label} / year`])
    }
    for (const module of PLAN_MODULES) {
      assert.includeMembers(labels, [`module ${module} / month`, `module ${module} / year`])
    }
    for (const addon of PLAN_ADDONS) {
      assert.includeMembers(labels, [`addon ${addon} / month`, `addon ${addon} / year`])
    }
    assert.lengthOf(rows, 2 * (2 + PLAN_MODULES.length + PLAN_ADDONS.length))
  })

  test('un prix annuel porte le total annuel, pas le mensuel-équivalent', ({ assert }) => {
    const rows = new PricingCatalogService(fakeStripe({})).expectedPrices()
    const find = (label: string) => rows.find((r) => r.label === label)!

    assert.equal(find('enterprise / year').amountCents, PLAN_PRICES.enterprise.annualTotal * 100)
    assert.notEqual(
      find('enterprise / year').amountCents,
      PLAN_PRICES.enterprise.annualMonthly * 100
    )
    assert.equal(find('pro / month').amountCents, PLAN_PRICES.pro.monthly * 100)
    assert.equal(find('module charter / year').amountCents, MODULE_PRICES.charter.annualTotal * 100)
    assert.equal(
      find('addon extra_boats / month').amountCents,
      ADDON_PRICES.extra_boats.monthly * 100
    )
  })

  test('les identifiants absents de la configuration ne sont pas devinés', ({ assert }) => {
    const rows = new PricingCatalogService(fakeStripe({})).expectedPrices()

    for (const row of rows) {
      assert.match(row.envVar, /^STRIPE_[A-Z0-9_]+_(MONTHLY|ANNUAL)_PRICE_ID$/)
    }
  })
})

test.group('PricingCatalogService — confrontation à Stripe', () => {
  test('un montant conforme ne remonte aucun écart', async ({ assert }) => {
    const service = new PricingCatalogService(
      fakeStripe({
        'pro / month': { unit_amount: PLAN_PRICES.pro.monthly * 100 },
      })
    )
    service.expectedPrices = () => [
      {
        label: 'pro / month',
        envVar: 'STRIPE_PRO_MONTHLY_PRICE_ID',
        priceId: 'pro / month',
        amountCents: PLAN_PRICES.pro.monthly * 100,
        interval: 'month',
      },
    ]

    const report = await service.check()

    assert.lengthOf(report.mismatches, 0)
    assert.lengthOf(report.matched, 1)
  })

  test('un écart de montant est rapporté — le cas des 950 € annoncés pour 948', async ({
    assert,
  }) => {
    const service = new PricingCatalogService(
      fakeStripe({ 'enterprise / year': { unit_amount: 94_800, recurring: { interval: 'year' } } })
    )
    service.expectedPrices = () => [
      {
        label: 'enterprise / year',
        envVar: 'STRIPE_ENTERPRISE_ANNUAL_PRICE_ID',
        priceId: 'enterprise / year',
        amountCents: 95_000,
        interval: 'year',
      },
    ]

    const report = await service.check()

    assert.lengthOf(report.mismatches, 1)
    assert.equal(report.mismatches[0].reason, 'amount')
    assert.equal(report.mismatches[0].expected, '95000')
    assert.equal(report.mismatches[0].actual, '94800')
  })

  test('une devise, un intervalle ou un prix archivé divergent sont rapportés', async ({
    assert,
  }) => {
    const cases: Array<[StripePriceStub, string]> = [
      [{ unit_amount: 2000, currency: 'usd' }, 'currency'],
      [{ unit_amount: 2000, recurring: { interval: 'year' } }, 'interval'],
      [{ unit_amount: 2000, active: false }, 'inactive'],
    ]

    for (const [stub, reason] of cases) {
      const service = new PricingCatalogService(fakeStripe({ p: stub }))
      service.expectedPrices = () => [
        {
          label: 'pro / month',
          envVar: 'STRIPE_PRO_MONTHLY_PRICE_ID',
          priceId: 'p',
          amountCents: 2000,
          interval: 'month',
        },
      ]

      const report = await service.check()
      assert.lengthOf(report.mismatches, 1)
      assert.equal(report.mismatches[0].reason, reason)
    }
  })

  test('un prix introuvable chez Stripe est rapporté, jamais silencieux', async ({ assert }) => {
    const service = new PricingCatalogService(fakeStripe({}))
    service.expectedPrices = () => [
      {
        label: 'pro / month',
        envVar: 'STRIPE_PRO_MONTHLY_PRICE_ID',
        priceId: 'price_absent',
        amountCents: 2000,
        interval: 'month',
      },
    ]

    const report = await service.check()

    assert.lengthOf(report.mismatches, 1)
    assert.equal(report.mismatches[0].reason, 'unreadable')
  })

  test('un identifiant non configuré est listé à part, pas compté comme un écart', async ({
    assert,
  }) => {
    const service = new PricingCatalogService(fakeStripe({}))
    service.expectedPrices = () => [
      {
        label: 'pro / month',
        envVar: 'STRIPE_PRO_MONTHLY_PRICE_ID',
        priceId: null,
        amountCents: 2000,
        interval: 'month',
      },
    ]

    const report = await service.check()

    assert.lengthOf(report.mismatches, 0)
    assert.lengthOf(report.skipped, 1)
  })
})
