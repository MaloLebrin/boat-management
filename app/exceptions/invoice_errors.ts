import type { InvoiceReminderSkipReason } from '#shared/types/invoice_reminder'

export class InvoiceNotFoundError extends Error {
  name = 'InvoiceNotFoundError'
}

/**
 * Raised when trying to convert a document that is not a quote (kind !== 'quote').
 */
export class NotAQuoteError extends Error {
  name = 'NotAQuoteError'
}

/**
 * Raised when trying to convert a quote that has already been converted into an invoice.
 */
export class QuoteAlreadyConvertedError extends Error {
  name = 'QuoteAlreadyConvertedError'
}

/**
 * Raised when trying to mark a document as paid while it cannot transition to `paid`
 * (not an invoice, or already cancelled).
 */
export class CannotMarkPaidError extends Error {
  name = 'CannotMarkPaidError'
}

/**
 * Raised when trying to rewrite an issued invoice (#717) — a real invoice that
 * has left the `draft` status. Only its payment date and payment method remain
 * editable, through the dedicated payment route.
 */
export class InvoiceLockedError extends Error {
  name = 'InvoiceLockedError'
}

/**
 * Raised when trying to edit the payment information of a document that cannot
 * carry any: a quote, a draft invoice (which goes through the regular form) or a
 * cancelled invoice.
 */
export class CannotEditPaymentError extends Error {
  name = 'CannotEditPaymentError'
}

/**
 * Raised when issuing a credit note (#877) on a document that cannot carry one:
 * a quote, a draft, a cancelled invoice or an invoice already fully credited.
 */
export class CannotIssueCreditNoteError extends Error {
  name = 'CannotIssueCreditNoteError'
}

/**
 * Raised when a credit note (#877) would credit more than what remains of the
 * invoice (its total minus the credit notes already issued), or nothing at all.
 */
export class CreditNoteAmountError extends Error {
  name = 'CreditNoteAmountError'
}

/**
 * Raised when a credit note is requested without lines on an invoice that
 * already carries one (#877): the mirror of the invoice would over-credit it.
 */
export class CreditNoteLinesRequiredError extends Error {
  name = 'CreditNoteLinesRequiredError'
}

/**
 * Raised when deleting a credit note, or an invoice that carries credit notes
 * (#877): both are accounting records tied together.
 */
export class CreditNoteDeleteError extends Error {
  name = 'CreditNoteDeleteError'
}

/**
 * Raised when a reminder (#878) is requested on a document that cannot be
 * reminded: not an overdue invoice, or reminders disabled on it.
 */
export class CannotRemindInvoiceError extends Error {
  name = 'CannotRemindInvoiceError'
}

/**
 * Raised when a manual reminder (#878) has nobody to write to: no CRM client,
 * client without e-mail, anonymized or blacklisted client.
 */
export class InvoiceReminderRecipientError extends Error {
  name = 'InvoiceReminderRecipientError'

  constructor(public readonly reason: InvoiceReminderSkipReason) {
    super(`Invoice reminder has no recipient: ${reason}`)
  }
}
