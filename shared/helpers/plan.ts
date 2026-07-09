import { MODULE_FLAGS, PLAN_LIMITS } from '#shared/types/plan'
import type { PlanModule, PlanQuotas, PlanTier } from '#shared/types/plan'

/**
 * Quotas effectifs d'une organisation = quotas du tier fusionnés avec les
 * flags accordés par ses modules actifs (épic #327). Fonction pure, seule
 * source de vérité partagée backend (policies, QuotaService) / frontend
 * (navigation, composables) — ne jamais recombiner tier + modules ailleurs.
 */
export function resolveEffectiveQuotas(tier: PlanTier, modules: readonly PlanModule[]): PlanQuotas {
  const quotas: PlanQuotas = { ...PLAN_LIMITS[tier] }
  for (const module of modules) {
    Object.assign(quotas, MODULE_FLAGS[module])
  }
  return quotas
}
