import vine from '@vinejs/vine'
import { INVOICE_PAYMENT_METHODS } from '#shared/helpers/invoice_lifecycle'

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
    currency: vine.string().trim().fixedLength(3).optional(),
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
    currency: vine.string().trim().fixedLength(3).optional(),
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
