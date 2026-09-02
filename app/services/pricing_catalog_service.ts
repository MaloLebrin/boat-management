import { inject } from '@adonisjs/core'
import env from '#start/env'
import StripeService from '#services/stripe_service'
import { ADDON_PRICES, MODULE_PRICES, PLAN_PRICES } from '#shared/types/plan'
import type { PlanPrice } from '#shared/types/plan'
import type { ExpectedPrice, PriceMismatch, PricingCheckReport } from '#shared/types/billing'

/** Devise unique du catalogue — l'app est mono-devise (EUR). */
const CATALOG_CURRENCY = 'eur'

/**
 * Le catalogue attendu : chaque ligne du barème avec les deux variables
 * d'environnement qui portent ses identifiants Stripe. La table est explicite
 * plutôt que composée par concaténation de chaînes — `env.get` est typé sur le
 * schéma de `start/env.ts`, et une clé calculée y perdrait cette vérification.
 * Un module ou un add-on ajouté sans sa ligne ici est rattrapé par les tests.
 */
const CATALOG: ReadonlyArray<{
  label: string
  price: PlanPrice
  monthly: () => string | undefined
  annual: () => string | undefined
  monthlyVar: string
  annualVar: string
}> = [
  {
    label: 'pro',
    price: PLAN_PRICES.pro,
    monthlyVar: 'STRIPE_PRO_MONTHLY_PRICE_ID',
    annualVar: 'STRIPE_PRO_ANNUAL_PRICE_ID',
    monthly: () => env.get('STRIPE_PRO_MONTHLY_PRICE_ID'),
    annual: () => env.get('STRIPE_PRO_ANNUAL_PRICE_ID'),
  },
  {
    label: 'enterprise',
    price: PLAN_PRICES.enterprise,
    monthlyVar: 'STRIPE_ENTERPRISE_MONTHLY_PRICE_ID',
    annualVar: 'STRIPE_ENTERPRISE_ANNUAL_PRICE_ID',
    monthly: () => env.get('STRIPE_ENTERPRISE_MONTHLY_PRICE_ID'),
    annual: () => env.get('STRIPE_ENTERPRISE_ANNUAL_PRICE_ID'),
  },
  {
    label: 'module charter',
    price: MODULE_PRICES.charter,
    monthlyVar: 'STRIPE_MODULE_CHARTER_MONTHLY_PRICE_ID',
    annualVar: 'STRIPE_MODULE_CHARTER_ANNUAL_PRICE_ID',
    monthly: () => env.get('STRIPE_MODULE_CHARTER_MONTHLY_PRICE_ID'),
    annual: () => env.get('STRIPE_MODULE_CHARTER_ANNUAL_PRICE_ID'),
  },
  {
    label: 'module crm_invoicing',
    price: MODULE_PRICES.crm_invoicing,
    monthlyVar: 'STRIPE_MODULE_CRM_INVOICING_MONTHLY_PRICE_ID',
    annualVar: 'STRIPE_MODULE_CRM_INVOICING_ANNUAL_PRICE_ID',
    monthly: () => env.get('STRIPE_MODULE_CRM_INVOICING_MONTHLY_PRICE_ID'),
    annual: () => env.get('STRIPE_MODULE_CRM_INVOICING_ANNUAL_PRICE_ID'),
  },
  {
    label: 'addon extra_boats',
    price: ADDON_PRICES.extra_boats,
    monthlyVar: 'STRIPE_ADDON_EXTRA_BOATS_MONTHLY_PRICE_ID',
    annualVar: 'STRIPE_ADDON_EXTRA_BOATS_ANNUAL_PRICE_ID',
    monthly: () => env.get('STRIPE_ADDON_EXTRA_BOATS_MONTHLY_PRICE_ID'),
    annual: () => env.get('STRIPE_ADDON_EXTRA_BOATS_ANNUAL_PRICE_ID'),
  },
]

/**
 * Confronte le barème affiché par l'app (`PLAN_PRICES`, `MODULE_PRICES`,
 * `ADDON_PRICES`) au catalogue Stripe, qui détient les montants réellement
 * facturés (#612).
 *
 * Les prix restent en dur côté code : la page tarifs est publique, rendue en
 * SSR sans clé Stripe (les variables `STRIPE_*` sont toutes optionnelles), et
 * les composants Vue importent le barème de façon synchrone. Plutôt que de
 * rendre l'affichage dépendant du réseau, on vérifie l'accord des deux sources
 * à la demande, via `node ace pricing:check`.
 */
@inject()
export default class PricingCatalogService {
  constructor(private stripeService: StripeService) {}

  /**
   * Le barème attendu, ligne à ligne. Un prix mensuel Stripe porte la
   * mensualité (`monthly`) ; un prix annuel porte le **total annuel**
   * (`annualTotal`), pas le mensuel-équivalent affiché sur la page tarifs.
   */
  expectedPrices(): ExpectedPrice[] {
    return CATALOG.flatMap((entry): ExpectedPrice[] => [
      {
        label: `${entry.label} / month`,
        envVar: entry.monthlyVar,
        priceId: entry.monthly() ?? null,
        amountCents: Math.round(entry.price.monthly * 100),
        interval: 'month',
      },
      {
        label: `${entry.label} / year`,
        envVar: entry.annualVar,
        priceId: entry.annual() ?? null,
        amountCents: Math.round(entry.price.annualTotal * 100),
        interval: 'year',
      },
    ])
  }

  /**
   * Lit chaque prix configuré chez Stripe et rapporte les écarts. Les prix dont
   * l'identifiant n'est pas renseigné sont listés à part plutôt que traités
   * comme des erreurs : un environnement sans Stripe doit pouvoir tourner.
   */
  async check(): Promise<PricingCheckReport> {
    const report: PricingCheckReport = { matched: [], skipped: [], mismatches: [] }

    for (const expected of this.expectedPrices()) {
      if (!expected.priceId) {
        report.skipped.push(expected)
        continue
      }

      const mismatch = await this.compareOne(expected, expected.priceId)
      if (mismatch) report.mismatches.push(mismatch)
      else report.matched.push(expected)
    }

    return report
  }

  private async compareOne(
    expected: ExpectedPrice,
    priceId: string
  ): Promise<PriceMismatch | null> {
    const fail = (
      reason: PriceMismatch['reason'],
      expectedValue: string,
      actual: string
    ): PriceMismatch => ({
      label: expected.label,
      priceId,
      reason,
      expected: expectedValue,
      actual,
    })

    let price
    try {
      price = await this.stripeService.retrievePrice(priceId)
    } catch (error) {
      return fail('unreadable', expected.envVar, error instanceof Error ? error.message : 'unknown')
    }

    if (price.active === false) return fail('inactive', 'active', 'archived')
    if (price.currency !== CATALOG_CURRENCY) {
      return fail('currency', CATALOG_CURRENCY, price.currency)
    }
    if (price.recurring?.interval !== expected.interval) {
      return fail('interval', expected.interval, price.recurring?.interval ?? 'one-off')
    }
    if (price.unit_amount !== expected.amountCents) {
      return fail('amount', String(expected.amountCents), String(price.unit_amount))
    }

    return null
  }
}
