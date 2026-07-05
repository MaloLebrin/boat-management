/**
 * Pure invoice totals computation, shared by the backend (authoritative
 * persistence of `subtotal` / `tax_amount` / `total` / line `amount`) and the
 * frontend (live preview in the invoice form). Keeping it in one pure function
 * guarantees the estimate shown to the user matches what is stored.
 */

export interface InvoiceTotalsLineInput {
  quantity: number
  unitPrice: number
}

export interface InvoiceTotalsLine {
  amount: number
}

export interface InvoiceTotals {
  lines: InvoiceTotalsLine[]
  subtotal: number
  taxAmount: number
  total: number
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Computes an invoice's monetary totals from its lines and a single VAT rate.
 *
 * Rounding policy (documented on purpose): each line `amount` is rounded to 2
 * decimals BEFORE summing, the subtotal is the rounded sum of rounded line
 * amounts, and VAT is applied on that single rounded subtotal (one taxable
 * base, not per line). `taxRate` is a percentage (e.g. `20` = 20 %).
 */
export function computeInvoiceTotals(
  lines: InvoiceTotalsLineInput[],
  taxRate: number
): InvoiceTotals {
  const computedLines = lines.map((line) => ({
    amount: round2((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)),
  }))

  const subtotal = round2(computedLines.reduce((sum, line) => sum + line.amount, 0))
  const rate = Number(taxRate) || 0
  const taxAmount = round2((subtotal * rate) / 100)
  const total = round2(subtotal + taxAmount)

  return { lines: computedLines, subtotal, taxAmount, total }
}
