import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { resolveEffectiveQuotas } from '../../shared/helpers/plan'
import { isPlanModule } from '../../shared/types/plan'
import type { PlanModule, PlanQuotas, PlanTier } from '../../shared/types/plan'

const VALID_PLANS = new Set<string>(['starter', 'pro', 'enterprise'])

/**
 * Plan courant, modules actifs et quotas effectifs de l'organisation,
 * dérivés des props Inertia partagées (`currentPlan`, `activeModules`).
 * Les quotas effectifs sont résolus par le même helper pur que le backend
 * (`resolveEffectiveQuotas`) — ne jamais recombiner tier + modules ailleurs.
 */
export function usePlan() {
  const page = usePage()

  const currentPlan = computed<PlanTier | null>(() => {
    const plan = page.props.currentPlan
    if (typeof plan !== 'string' || !VALID_PLANS.has(plan)) return null
    return plan as PlanTier
  })

  const activeModules = computed<PlanModule[]>(() => {
    const raw = page.props.activeModules
    if (!Array.isArray(raw)) return []
    return raw.filter(
      (value): value is PlanModule => typeof value === 'string' && isPlanModule(value)
    )
  })

  const effectiveQuotas = computed<PlanQuotas | null>(() => {
    if (currentPlan.value === null) return null
    return resolveEffectiveQuotas(currentPlan.value, activeModules.value)
  })

  return { currentPlan, activeModules, effectiveQuotas }
}
