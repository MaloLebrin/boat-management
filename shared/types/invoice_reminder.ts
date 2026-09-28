/** Relances des factures en retard (#878). */

export type InvoiceReminderTrigger = 'automatic' | 'manual'
export type InvoiceReminderOutcome = 'sent' | 'skipped'
/**
 * Pourquoi un palier atteint n'a pas donné d'e-mail : pas de client CRM, client
 * sans e-mail, client anonymisé (RGPD) ou blacklisté.
 */
export type InvoiceReminderSkipReason = 'no_client' | 'no_email' | 'anonymized' | 'blacklisted'

export interface InvoiceReminderRow {
  id: number
  tier: number
  trigger: InvoiceReminderTrigger
  outcome: InvoiceReminderOutcome
  skipReason: InvoiceReminderSkipReason | null
  userName: string | null
  createdAt: string
}

/** Bloc « Relances » de la fiche facture. */
export interface InvoiceRemindersInfo {
  count: number
  lastReminderAt: string | null
  disabled: boolean
  history: InvoiceReminderRow[]
  /** Vrai quand l'organisation a activé les relances automatiques. */
  automaticEnabled: boolean
}

/** Réglages des relances, carte de `/settings/billing`. */
export interface InvoiceRemindersSettings {
  enabled: boolean
  message: string | null
  latePenaltyNote: string | null
  tiers: readonly number[]
  /** Module CRM & Facturation actif : sans lui, aucune relance ne part. */
  available: boolean
  canManage: boolean
}

export interface UpdateInvoiceRemindersSettingsPayload {
  enabled: boolean
  message?: string | null
  latePenaltyNote?: string | null
}

/** Résultat d'un passage du job quotidien. */
export interface InvoiceRemindersRunResult {
  sent: number
  skipped: number
}
