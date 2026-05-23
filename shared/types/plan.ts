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

export interface PlanPrice {
  monthly: number
  annualMonthly: number
  annualTotal: number
}

export const PLAN_PRICES: Record<PlanTier, PlanPrice> = {
  starter: { monthly: 0, annualMonthly: 0, annualTotal: 0 },
  pro: { monthly: 20, annualMonthly: 16, annualTotal: 192 },
  enterprise: { monthly: 99, annualMonthly: 79, annualTotal: 950 },
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
