import type { PlanTier } from '#shared/types/plan'

export type QuotaFeature = 'boats' | 'members' | 'ai' | 'export' | 'storage'

interface QuotaExceededOptions {
  limit: number | null
  current: number
  upgradeTo: PlanTier | null
  alreadyOverLimit?: boolean
}

export class QuotaExceededError extends Error {
  name = 'QuotaExceededError'

  readonly limit: number | null
  readonly current: number
  readonly upgradeTo: PlanTier | null
  readonly alreadyOverLimit: boolean

  constructor(
    public readonly feature: QuotaFeature,
    options: QuotaExceededOptions
  ) {
    super(`Quota exceeded: ${feature}`)
    this.limit = options.limit
    this.current = options.current
    this.upgradeTo = options.upgradeTo
    this.alreadyOverLimit = options.alreadyOverLimit ?? false
  }
}
