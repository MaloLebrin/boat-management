import vine from '@vinejs/vine'
import {
  ACCOUNTING_ACCOUNT_PATTERN,
  FEC_MIN_YEAR,
  INVOICE_EXPORT_STATUSES,
  SIREN_PATTERN,
} from '#shared/constants/exports'
import { RESERVATION_PAYMENT_STATUSES, RESERVATION_STATUSES } from '#shared/types/reservation'

/**
 * Exports comptables et exports flotte (#879). Toutes les bornes sont
 * incluses ; `to` antérieur à `from` est refusé.
 */
const periodFields = {
  from: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
  to: vine
    .date({ formats: ['YYYY-MM-DD'] })
    .afterOrSameAs('from')
    .optional(),
}

/** Filtre de période des exports par bateau. */
export const exportPeriodValidator = vine.create(vine.object(periodFields))

export const invoiceExportValidator = vine.create(
  vine.object({
    ...periodFields,
    kind: vine.enum(['invoice', 'credit_note'] as const).optional(),
    status: vine.enum(INVOICE_EXPORT_STATUSES).optional(),
    detail: vine.enum(['documents', 'lines'] as const).optional(),
  })
)

export const fecExportValidator = vine.create(
  vine.object({
    year: vine.number().withoutDecimals().min(FEC_MIN_YEAR).max(2100),
  })
)

export const reservationExportValidator = vine.create(
  vine.object({
    ...periodFields,
    boatId: vine.number().withoutDecimals().positive().optional(),
    status: vine.enum(RESERVATION_STATUSES).optional(),
    paymentStatus: vine.enum(RESERVATION_PAYMENT_STATUSES).optional(),
  })
)

export const clientExportValidator = vine.create(vine.object(periodFields))

/** Comptes du FEC et SIREN, carte « Export comptable » de `/settings/billing`. */
export const accountingSettingsValidator = vine.create(
  vine.object({
    siren: vine.string().trim().regex(SIREN_PATTERN).nullable().optional(),
    salesAccount: vine.string().trim().toUpperCase().regex(ACCOUNTING_ACCOUNT_PATTERN),
    vatAccount: vine.string().trim().toUpperCase().regex(ACCOUNTING_ACCOUNT_PATTERN),
    customerAccount: vine.string().trim().toUpperCase().regex(ACCOUNTING_ACCOUNT_PATTERN),
    bankAccount: vine.string().trim().toUpperCase().regex(ACCOUNTING_ACCOUNT_PATTERN),
  })
)
