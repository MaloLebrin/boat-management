import { ADDON_QUOTA_INCREMENTS, MODULE_FLAGS, PLAN_LIMITS } from '#shared/types/plan'
import type { PlanAddon, PlanModule, PlanQuotas, PlanTier } from '#shared/types/plan'

/** Add-on actif avec sa quantité, tel que consommé par la résolution de quotas. */
export interface ActiveAddonQuantity {
  addon: PlanAddon
  quantity: number
}

/**
 * Quotas effectifs d'une organisation = quotas du tier, fusionnés avec les
 * flags booléens de ses modules actifs (épic #327), puis augmentés par les
 * add-ons quantitatifs (épic #333). Fonction pure, seule source de vérité
 * partagée backend (policies, QuotaService) / frontend (navigation,
 * composables) — ne jamais recombiner tier + modules + add-ons ailleurs.
 *
 * - Un **module** ne fait qu'écraser des flags (jamais un quota numérique).
 * - Un **add-on** ajoute `perUnit × quantity` à un quota numérique, sauf si
 *   celui-ci est illimité (`null`, ex. Enterprise) — l'illimité n'est jamais
 *   dégradé.
 */
export function resolveEffectiveQuotas(
  tier: PlanTier,
  modules: readonly PlanModule[],
  addons: readonly ActiveAddonQuantity[] = []
): PlanQuotas {
  const quotas: PlanQuotas = { ...PLAN_LIMITS[tier] }
  for (const module of modules) {
    Object.assign(quotas, MODULE_FLAGS[module])
  }
  for (const { addon, quantity } of addons) {
    if (quantity <= 0) continue
    const { field, perUnit } = ADDON_QUOTA_INCREMENTS[addon]
    const current = quotas[field]
    if (typeof current === 'number') {
      quotas[field] = current + perUnit * quantity
    }
  }
  return quotas
}
