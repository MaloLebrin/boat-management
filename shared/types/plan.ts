export type PlanTier = 'starter' | 'pro' | 'enterprise'

export interface PlanQuotas {
  maxBoats: number | null
  maxMembers: number | null
  canUseAI: boolean
  canExport: boolean
}

export interface QuotaUsage {
  boats: { used: number; limit: number | null }
  members: { used: number; limit: number | null }
  canUseAI: boolean
  canExport: boolean
}

export const PLAN_LIMITS: Record<PlanTier, PlanQuotas> = {
  starter: { maxBoats: 2, maxMembers: 1, canUseAI: false, canExport: false },
  pro: { maxBoats: 25, maxMembers: 5, canUseAI: true, canExport: true },
  enterprise: { maxBoats: null, maxMembers: null, canUseAI: true, canExport: true },
}

export function getUpgradeTier(current: PlanTier): PlanTier | null {
  if (current === 'starter') return 'pro'
  if (current === 'pro') return 'enterprise'
  return null
}
