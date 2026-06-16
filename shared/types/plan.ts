export type PlanTier = 'starter' | 'pro' | 'enterprise'

export interface PlanQuotas {
  maxBoats: number | null
  maxMembers: number | null
  storageGb: number | null
  canUseAI: boolean
  canExport: boolean
  canCustomizeAI: boolean
  /** Retention in days; 0 = no audit log; null = unlimited */
  auditLogRetentionDays: number | null
  /** Monthly AI token limit; null = unlimited */
  aiTokensPerMonth: number | null
}

export interface QuotaUsage {
  boats: { used: number; limit: number | null }
  members: { used: number; limit: number | null }
  storage: { usedBytes: number; limitBytes: number | null }
  aiTokens: { used: number; limit: number | null }
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
  starter: {
    maxBoats: 2,
    maxMembers: 1,
    storageGb: 1,
    canUseAI: false,
    canExport: false,
    canCustomizeAI: false,
    auditLogRetentionDays: 0,
    aiTokensPerMonth: null,
  },
  pro: {
    maxBoats: 25,
    maxMembers: 5,
    storageGb: 20,
    canUseAI: true,
    canExport: true,
    canCustomizeAI: false,
    auditLogRetentionDays: 90,
    aiTokensPerMonth: 1_000_000,
  },
  enterprise: {
    maxBoats: null,
    maxMembers: null,
    storageGb: null,
    canUseAI: true,
    canExport: true,
    canCustomizeAI: true,
    auditLogRetentionDays: null,
    aiTokensPerMonth: null,
  },
}

export function getUpgradeTier(current: PlanTier): PlanTier | null {
  if (current === 'starter') return 'pro'
  if (current === 'pro') return 'enterprise'
  return null
}
