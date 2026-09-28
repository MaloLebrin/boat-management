import type Invoice from '#models/invoice'
import { invoiceBalanceDue, roundMoney } from '#shared/helpers/invoice_lifecycle'
import type {
  CreditNoteLink,
  InvoiceRow,
  InvoiceDetail,
  InvoiceLineRow,
  InvoiceLink,
} from '#shared/types/invoice'

export function toInvoiceRow(invoice: Invoice): InvoiceRow {
  return {
    id: invoice.id,
    kind: invoice.kind,
    number: invoice.number,
    status: invoice.status,
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    reservationId: invoice.reservationId,
    issuedAt: invoice.issuedAt?.toISODate() ?? null,
    dueAt: invoice.dueAt?.toISODate() ?? null,
    paidAt: invoice.paidAt?.toISODate() ?? null,
    paymentMethod: invoice.paymentMethod ?? null,
    sourceQuoteId: invoice.sourceQuoteId,
    creditedInvoiceId: invoice.creditedInvoiceId ?? null,
    subtotal: Number.parseFloat(invoice.subtotal),
    taxRate: Number.parseFloat(invoice.taxRate),
    taxAmount: Number.parseFloat(invoice.taxAmount),
    total: Number.parseFloat(invoice.total),
    currency: invoice.currency,
    createdAt: invoice.createdAt?.toISO() ?? null,
  }
}

function toInvoiceLink(invoice: Invoice | null | undefined): InvoiceLink | null {
  if (!invoice) return null
  return { id: invoice.id, number: invoice.number }
}

function toCreditNoteLink(creditNote: Invoice): CreditNoteLink {
  return {
    id: creditNote.id,
    number: creditNote.number,
    status: creditNote.status,
    issuedAt: creditNote.issuedAt?.toISODate() ?? null,
    total: Number.parseFloat(creditNote.total),
  }
}

export interface InvoiceLinks {
  sourceQuote?: Invoice | null
  convertedInvoice?: Invoice | null
  /** Avoir (#877) : la facture qu'il corrige. */
  creditedInvoice?: Invoice | null
  /** Facture (#877) : les avoirs émis sur elle. */
  creditNotes?: Invoice[]
}

export function toInvoiceDetail(
  invoice: Invoice,
  links: InvoiceLinks = {},
  onlinePaymentUrl: string | null = null
): InvoiceDetail {
  const sortedLines = [...invoice.lines].sort((a, b) => a.position - b.position)

  const lines: InvoiceLineRow[] = sortedLines.map((line) => ({
    id: line.id,
    label: line.label,
    quantity: Number.parseFloat(line.quantity),
    unitPrice: Number.parseFloat(line.unitPrice),
    amount: Number.parseFloat(line.amount),
    position: line.position,
  }))

  const creditNotes = (links.creditNotes ?? []).map(toCreditNoteLink)
  const creditedTotal = roundMoney(creditNotes.reduce((sum, note) => sum + note.total, 0))

  return {
    ...toInvoiceRow(invoice),
    notes: invoice.notes,
    lines,
    sourceQuote: toInvoiceLink(links.sourceQuote),
    convertedInvoice: toInvoiceLink(links.convertedInvoice),
    reservationBoatId: invoice.reservation?.boatId ?? null,
    onlinePaymentUrl,
    creditedInvoice: toInvoiceLink(links.creditedInvoice),
    creditNotes,
    creditedTotal,
    balanceDue: invoiceBalanceDue(invoice, creditedTotal),
  }
}
