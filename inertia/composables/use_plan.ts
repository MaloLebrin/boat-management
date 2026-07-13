import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { resolveEffectiveQuotas } from '../../shared/helpers/plan'
import type { ActiveAddonQuantity } from '../../shared/helpers/plan'
import { isPlanAddon, isPlanModule } from '../../shared/types/plan'
import type { ActiveAddonInfo, PlanModule, PlanQuotas, PlanTier } from '../../shared/types/plan'

const VALID_PLANS = new Set<string>(['starter', 'pro', 'enterprise'])

/**
 * Plan courant, modules actifs, add-ons quantitatifs et quotas effectifs de
 * l'organisation, dérivés des props Inertia partagées (`currentPlan`,
 * `activeModules`, `activeAddons`). Les quotas effectifs sont résolus par le
 * même helper pur que le backend (`resolveEffectiveQuotas`) — ne jamais
 * recombiner tier + modules + add-ons ailleurs.
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

  const activeAddons = computed<ActiveAddonInfo[]>(() => {
    const raw = page.props.activeAddons
    if (!Array.isArray(raw)) return []
    return raw.filter(
      (value): value is ActiveAddonInfo =>
        typeof value === 'object' &&
        value !== null &&
        typeof (value as ActiveAddonInfo).addon === 'string' &&
        isPlanAddon((value as ActiveAddonInfo).addon) &&
        typeof (value as ActiveAddonInfo).quantity === 'number'
    )
  })

  const effectiveQuotas = computed<PlanQuotas | null>(() => {
    if (currentPlan.value === null) return null
    const addons: ActiveAddonQuantity[] = activeAddons.value.map((a) => ({
      addon: a.addon,
      quantity: a.quantity,
    }))
    return resolveEffectiveQuotas(currentPlan.value, activeModules.value, addons)
  })

  return { currentPlan, activeModules, activeAddons, effectiveQuotas }
}
