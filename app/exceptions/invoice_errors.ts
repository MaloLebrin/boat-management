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
