import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { PLAN_LIMITS } from '../../shared/types/plan'
import type { PlanTier } from '../../shared/types/plan'

const VALID_PLANS = new Set<string>(['starter', 'pro', 'enterprise'])

/**
 * Composable pour vérifier si l'utilisateur a le droit d'exporter des données.
 * Basé sur le plan de l'organisation.
 */
export function useCanExport() {
  const page = usePage()

  const canExport = computed(() => {
    const plan = page.props.currentPlan
    if (typeof plan !== 'string' || !VALID_PLANS.has(plan)) return false
    return PLAN_LIMITS[plan as PlanTier].canExport
  })

  return { canExport }
}
