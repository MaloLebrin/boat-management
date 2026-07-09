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
  canGroupTasks: boolean
  canWhiteLabel: boolean
  /** Client CRM (clients management) — Enterprise only. */
  canManageClients: boolean
  /** Tarification par bateau — Enterprise only. */
  canManagePricing: boolean
  /** Devis/factures — Enterprise only. */
  canManageInvoices: boolean
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
    canGroupTasks: false,
    canWhiteLabel: false,
    canManageClients: false,
    canManagePricing: false,
    canManageInvoices: false,
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
    canGroupTasks: true,
    canWhiteLabel: false,
    canManageClients: false,
    canManagePricing: false,
    canManageInvoices: false,
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
    canGroupTasks: true,
    canWhiteLabel: true,
    canManageClients: true,
    canManagePricing: true,
    canManageInvoices: true,
  },
}

/**
 * Modules add-ons souscriptibles à la carte sur le socle Pro (épic #327).
 * Enterprise les inclut tous ; Starter n'y a pas accès.
 */
export type PlanModule = 'charter' | 'crm_invoicing'

export const PLAN_MODULES: readonly PlanModule[] = ['charter', 'crm_invoicing'] as const

/**
 * Origine d'un module actif : souscrit via Stripe, ou offert manuellement
 * (grandfathering des comptes existants, geste commercial).
 */
export type ModuleSource = 'subscription' | 'granted'

/** Module actif d'une organisation avec son origine, pour l'affichage in-app. */
export interface ActiveModuleInfo {
  module: PlanModule
  source: ModuleSource
}

export const MODULE_PRICES: Record<PlanModule, PlanPrice> = {
  charter: { monthly: 15, annualMonthly: 12, annualTotal: 144 },
  crm_invoicing: { monthly: 15, annualMonthly: 12, annualTotal: 144 },
}

/**
 * Flags de `PlanQuotas` accordés par chaque module, fusionnés avec ceux du
 * tier par la résolution des quotas effectifs (#329). Un module ne peut
 * qu'accorder des capacités, jamais en retirer.
 */
export const MODULE_FLAGS: Record<PlanModule, Partial<PlanQuotas>> = {
  charter: { canManagePricing: true },
  crm_invoicing: { canManageClients: true, canManageInvoices: true },
}

export function isPlanModule(value: string): value is PlanModule {
  return (PLAN_MODULES as readonly string[]).includes(value)
}

export function getUpgradeTier(current: PlanTier): PlanTier | null {
  if (current === 'starter') return 'pro'
  if (current === 'pro') return 'enterprise'
  return null
}
