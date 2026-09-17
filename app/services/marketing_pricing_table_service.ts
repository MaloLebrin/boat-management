import { ADDON_PRICES, PLAN_LIMITS, PLAN_PRICES } from '#shared/types/plan'
import type { BooleanQuotaKey } from '#shared/types/plan'
import type { MarketingTranslate, PricingTableRow } from '#shared/types/marketing'
import { formatPrice } from '#shared/helpers/number_format'

/**
 * Taille de flotte citée en exemple par la FAQ tarifaire de la home. Le montant
 * associé n'est pas recopié : il se calcule (socle Pro + un add-on `extra_boats`
 * par bateau au-delà du quota), pour que la réponse suive le barème (#505, #612).
 */
const FAQ_EXAMPLE_FLEET_SIZE = 15

/**
 * Logique tarifaire de la copie marketing (page tarifs, FAQ de la home) :
 * montants et quotas viennent de `PLAN_LIMITS` / `PLAN_PRICES`, jamais d'un
 * nombre recopié dans le JSON de traduction (#454, #505, #612).
 */
export default class MarketingPricingTableService {
  /**
   * Montants et quotas injectés dans la copie marketing (#612). Une chaîne de
   * traduction pose un patron ICU, jamais un nombre recopié : c'est la recopie
   * qui avait laissé vivre « 15 bateaux à 20 €/mois » (#505) et un comparatif
   * figé à côté du vrai barème (#454). Les prix passent par `formatPrice` avec
   * la locale de la requête, jamais celle du serveur.
   */
  copyParams(locale: string): Record<string, string> {
    const price = (value: number) => formatPrice(value, locale)
    const proBoats = PLAN_LIMITS.pro.maxBoats ?? 0
    const extraBoats = Math.max(FAQ_EXAMPLE_FLEET_SIZE - proBoats, 0)

    return {
      starterBoats: String(PLAN_LIMITS.starter.maxBoats ?? 0),
      starterMembers: String(PLAN_LIMITS.starter.maxMembers ?? 0),
      proBoats: String(proBoats),
      proMembers: String(PLAN_LIMITS.pro.maxMembers ?? 0),
      proStorage: String(PLAN_LIMITS.pro.storageGb ?? 0),
      proMonthly: price(PLAN_PRICES.pro.monthly),
      proAnnual: price(PLAN_PRICES.pro.annualMonthly),
      enterpriseMonthly: price(PLAN_PRICES.enterprise.monthly),
      enterpriseAnnual: price(PLAN_PRICES.enterprise.annualMonthly),
      extraBoatPrice: price(ADDON_PRICES.extra_boats.monthly),
      fleetBoats: String(FAQ_EXAMPLE_FLEET_SIZE),
      fleetTotal: price(PLAN_PRICES.pro.monthly + extraBoats * ADDON_PRICES.extra_boats.monthly),
    }
  }

  /**
   * Cellule de quota du comparatif : la valeur vient de `PLAN_LIMITS`, jamais
   * d'un nombre recopié dans le JSON de traduction — c'est cette recopie qui
   * avait fait diverger le comparatif du produit (#454).
   */
  quotaCell(
    t: MarketingTranslate,
    limit: number | null,
    boundedKey: string,
    unlimitedKey: string
  ): string {
    return limit === null ? t(unlimitedKey) : t(boundedKey, { count: String(limit) })
  }

  /** Ligne booléenne du comparatif adossée à un flag de capacité de `PLAN_LIMITS`. */
  flagRow(t: MarketingTranslate, labelKey: string, flag: BooleanQuotaKey): PricingTableRow {
    return [
      t(labelKey),
      PLAN_LIMITS.starter[flag],
      PLAN_LIMITS.pro[flag],
      PLAN_LIMITS.enterprise[flag],
    ]
  }

  /** Rétention de l'audit log : 0 jour = pas d'audit log, `null` = illimité. */
  auditCell(t: MarketingTranslate, days: number | null): string | false {
    if (days === null) return t('table_g3_r3_e')
    if (days === 0) return false
    return t('table_g3_r3_p', { count: String(days) })
  }
}
