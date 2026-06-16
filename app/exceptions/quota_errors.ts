import type { PlanTier } from '#shared/types/plan'

export type QuotaFeature = 'boats' | 'members' | 'ai' | 'export' | 'storage'

export class QuotaExceededError extends Error {
  name = 'QuotaExceededError'

  constructor(
    public readonly feature: QuotaFeature,
    public readonly limit: number | null,
    public readonly current: number,
    public readonly upgradeTo: PlanTier | null
  ) {
    super(`Quota exceeded: ${feature}`)
  }
}
