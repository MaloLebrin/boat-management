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
