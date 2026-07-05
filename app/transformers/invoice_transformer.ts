import type Invoice from '#models/invoice'
import type { InvoiceRow, InvoiceDetail, InvoiceLineRow, InvoiceLink } from '#shared/types/invoice'

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
    sourceQuoteId: invoice.sourceQuoteId,
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

export interface InvoiceLinks {
  sourceQuote?: Invoice | null
  convertedInvoice?: Invoice | null
}

export function toInvoiceDetail(invoice: Invoice, links: InvoiceLinks = {}): InvoiceDetail {
  const sortedLines = [...invoice.lines].sort((a, b) => a.position - b.position)

  const lines: InvoiceLineRow[] = sortedLines.map((line) => ({
    id: line.id,
    label: line.label,
    quantity: Number.parseFloat(line.quantity),
    unitPrice: Number.parseFloat(line.unitPrice),
    amount: Number.parseFloat(line.amount),
    position: line.position,
  }))

  return {
    ...toInvoiceRow(invoice),
    notes: invoice.notes,
    lines,
    sourceQuote: toInvoiceLink(links.sourceQuote),
    convertedInvoice: toInvoiceLink(links.convertedInvoice),
  }
}
