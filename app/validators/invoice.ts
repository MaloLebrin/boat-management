import vine from '@vinejs/vine'
import { SUPPORTED_CURRENCIES } from '#shared/types/currency'
import { INVOICE_PAYMENT_METHODS } from '#shared/helpers/invoice_lifecycle'
import { INVOICE_REMINDER_TEXT_MAX_LENGTH } from '#shared/constants/invoice_reminders'

const invoiceLineSchema = vine.object({
  label: vine.string().trim().minLength(1).maxLength(255),
  quantity: vine.number().positive(),
  unitPrice: vine.number().min(0),
})

export const createInvoiceValidator = vine.compile(
  vine.object({
    kind: vine.enum(['quote', 'invoice'] as const),
    clientId: vine.number().positive().nullable().optional(),
    reservationId: vine.number().positive().nullable().optional(),
    status: vine.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).optional(),
    issuedAt: vine.date({ formats: ['YYYY-MM-DD'] }),
    dueAt: vine
      .date({ formats: ['YYYY-MM-DD'] })
      .nullable()
      .optional(),
    taxRate: vine.number().range([0, 100]),
    currency: vine.enum(SUPPORTED_CURRENCIES).optional(),
    notes: vine.string().trim().maxLength(5000).nullable().optional(),
    lines: vine.array(invoiceLineSchema).minLength(1),
  })
)

export const updateInvoiceValidator = vine.compile(
  vine.object({
    kind: vine.enum(['quote', 'invoice'] as const),
    clientId: vine.number().positive().nullable().optional(),
    reservationId: vine.number().positive().nullable().optional(),
    status: vine.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).optional(),
    issuedAt: vine.date({ formats: ['YYYY-MM-DD'] }),
    dueAt: vine
      .date({ formats: ['YYYY-MM-DD'] })
      .nullable()
      .optional(),
    taxRate: vine.number().range([0, 100]),
    currency: vine.enum(SUPPORTED_CURRENCIES).optional(),
    notes: vine.string().trim().maxLength(5000).nullable().optional(),
    lines: vine.array(invoiceLineSchema).minLength(1),
  })
)

/**
 * Facture émise (#717) : seules la date et le moyen de paiement restent
 * modifiables. `paidAt: null` annule le paiement enregistré.
 */
export const updateInvoicePaymentValidator = vine.compile(
  vine.object({
    paidAt: vine
      .date({ formats: ['YYYY-MM-DD'] })
      .nullable()
      .optional(),
    paymentMethod: vine.enum(INVOICE_PAYMENT_METHODS).nullable().optional(),
  })
)

/**
 * Émission d'un avoir (#877) : un motif, et les lignes à créditer. Sans
 * lignes, avoir total — les lignes de la facture en miroir. Le taux de TVA,
 * le client et la devise viennent de la facture, jamais du formulaire.
 */
export const createCreditNoteValidator = vine.compile(
  vine.object({
    reason: vine.string().trim().minLength(1).maxLength(1000),
    lines: vine.array(invoiceLineSchema).minLength(1).optional(),
  })
)

/** Interrupteur « ne plus relancer » d'une facture (#878). */
export const updateInvoiceRemindersValidator = vine.compile(
  vine.object({
    disabled: vine.boolean(),
  })
)

/** Réglages des relances de l'organisation (#878), `/settings/billing`. */
export const updateInvoiceRemindersSettingsValidator = vine.compile(
  vine.object({
    enabled: vine.boolean(),
    message: vine.string().trim().maxLength(INVOICE_REMINDER_TEXT_MAX_LENGTH).nullable().optional(),
    latePenaltyNote: vine
      .string()
      .trim()
      .maxLength(INVOICE_REMINDER_TEXT_MAX_LENGTH)
      .nullable()
      .optional(),
  })
)
