export type InvoiceKind = 'quote' | 'invoice'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type InvoiceSortField = 'issuedAt' | 'number' | 'total' | 'status'
export type InvoiceSortDirection = 'asc' | 'desc'

export interface InvoiceLineInput {
  label: string
  quantity: number
  unitPrice: number
}
export interface InvoiceLineRow {
  id: number
  label: string
  quantity: number
  unitPrice: number
  amount: number
  position: number
}

export interface InvoiceRow {
  id: number
  kind: InvoiceKind
  number: string
  status: InvoiceStatus
  clientId: number | null
  clientName: string | null
  reservationId: number | null
  issuedAt: string | null
  dueAt: string | null
  paidAt: string | null
  sourceQuoteId: number | null
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  currency: string
  createdAt: string | null
}

/** Lightweight reference to a linked document (origin quote / converted invoice). */
export interface InvoiceLink {
  id: number
  number: string
}

export interface InvoiceDetail extends InvoiceRow {
  notes: string | null
  lines: InvoiceLineRow[]
  sourceQuote: InvoiceLink | null
  convertedInvoice: InvoiceLink | null
}

export interface CreateInvoicePayload {
  kind: InvoiceKind
  clientId?: number | null
  reservationId?: number | null
  status?: InvoiceStatus
  issuedAt: string
  dueAt?: string | null
  taxRate: number
  currency?: string
  notes?: string | null
  lines: InvoiceLineInput[]
}
export type UpdateInvoicePayload = CreateInvoicePayload

export interface InvoiceListFilters {
  q: string
  status: InvoiceStatus | ''
  kind: InvoiceKind | ''
  clientId: number | null
  issuedFrom: string
  issuedTo: string
  sort: InvoiceSortField
  direction: InvoiceSortDirection
  page: number
  perPage: number
}
export interface InvoiceListMeta {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
}
export interface InvoicesPaginated {
  data: InvoiceRow[]
  meta: InvoiceListMeta
}
