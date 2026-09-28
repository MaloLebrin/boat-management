import {
  INVOICE_REMINDER_LAST_TIER,
  INVOICE_REMINDER_TIERS,
} from '#shared/constants/invoice_reminders'
import type { InvoiceKind, InvoiceStatus } from '#shared/types/invoice'

/**
 * Règles des relances de factures en retard (#878), partagées entre le job
 * quotidien, la relance manuelle et la fiche facture.
 */

export interface InvoiceReminderState {
  kind: InvoiceKind
  status: InvoiceStatus
  remindersDisabled: boolean
}

/**
 * Vrai si la pièce peut être relancée : une facture en retard (`overdue`, posé
 * par le job de 06:00) sur laquelle personne n'a coché « ne plus relancer ».
 * Payée, annulée ou entièrement avoirée, elle ne doit plus rien.
 */
export function canRemindInvoice(invoice: InvoiceReminderState): boolean {
  return invoice.kind === 'invoice' && invoice.status === 'overdue' && !invoice.remindersDisabled
}

/** Jours calendaires entre deux dates `YYYY-MM-DD` (négatif si `to` précède `from`). */
function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}

/**
 * Palier atteint à `today` pour une échéance `dueAt` : 0 avant J+3, 1 de J+3 à
 * J+9, 2 de J+10 à J+29, 3 à partir de J+30.
 */
export function reachedReminderTier(dueAt: string, today: string): number {
  const late = daysBetween(dueAt, today)
  return INVOICE_REMINDER_TIERS.filter((days) => late >= days).length
}

/**
 * Palier que doit envoyer le job quotidien, ou `null` si rien n'est dû : le
 * palier atteint, s'il dépasse le dernier traité. Une facture découverte à J+40
 * reçoit directement la relance ferme, pas trois e-mails en trois jours.
 */
export function dueReminderTier(
  dueAt: string | null,
  lastReminderTier: number,
  today: string
): number | null {
  if (!dueAt) return null
  const reached = reachedReminderTier(dueAt, today)
  return reached > lastReminderTier ? reached : null
}

/**
 * Palier d'une relance « maintenant » : le suivant du dernier traité, plafonné
 * au dernier — une quatrième relance manuelle reprend le ton ferme.
 */
export function nextManualReminderTier(lastReminderTier: number): number {
  return Math.min(Math.max(lastReminderTier, 0) + 1, INVOICE_REMINDER_LAST_TIER)
}
