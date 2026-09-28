/**
 * Paliers des relances automatiques (#878), en jours après l'échéance. Le
 * palier `n` (1, 2, 3) part dès que la facture a `INVOICE_REMINDER_TIERS[n-1]`
 * jours de retard ; le dernier prend le ton ferme et porte la mention des
 * pénalités de retard.
 */
export const INVOICE_REMINDER_TIERS = [3, 10, 30] as const

export const INVOICE_REMINDER_LAST_TIER = INVOICE_REMINDER_TIERS.length

/** Longueur maximale du message libre et de la mention des pénalités. */
export const INVOICE_REMINDER_TEXT_MAX_LENGTH = 1000
