import { usePage } from '@inertiajs/vue3'
import { computed, type ComputedRef } from 'vue'
import type { PlanTier } from '../../shared/types/plan'

interface UseBillingReturn {
  currentPlan: ComputedRef<PlanTier | null>
  isStarter: ComputedRef<boolean>
  isPro: ComputedRef<boolean>
  isEnterprise: ComputedRef<boolean>
  canUpgrade: ComputedRef<boolean>
}

export function useBilling(): UseBillingReturn {
  const page = usePage()

  const currentPlan = computed(() => {
    const plan = (page.props as Record<string, unknown>).currentPlan as PlanTier | undefined
    return plan ?? null
  })

  const isStarter = computed(() => currentPlan.value === 'starter')
  const isPro = computed(() => currentPlan.value === 'pro')
  const isEnterprise = computed(() => currentPlan.value === 'enterprise')
  const canUpgrade = computed(
    () => currentPlan.value !== 'enterprise' && currentPlan.value !== null
  )

  return {
    currentPlan,
    isStarter,
    isPro,
    isEnterprise,
    canUpgrade,
  }
}
