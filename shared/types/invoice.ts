export type InvoiceKind = 'quote' | 'invoice'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
/**
 * Moyen de règlement d'une facture (#717). `online` n'est jamais saisi à la
 * main : seul le webhook Stripe d'un paiement en ligne le pose (#876).
 */
export type InvoicePaymentMethod = 'cash' | 'card' | 'transfer' | 'check' | 'other' | 'online'
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
  paymentMethod: InvoicePaymentMethod | null
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
  // Boat id of the linked reservation, so the UI can deep-link to it.
  reservationBoatId: number | null
  /**
   * Lien public de paiement en ligne (`/pay/:token`, #876), `null` tant qu'il
   * n'a pas été créé ou quand la facture n'est plus payable.
   */
  onlinePaymentUrl: string | null
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

/**
 * Les seuls champs qu'une facture émise accepte encore (#717) : la date et le
 * moyen de paiement. `paidAt: null` annule le paiement enregistré.
 */
export interface UpdateInvoicePaymentPayload {
  paidAt: string | null
  paymentMethod?: InvoicePaymentMethod | null
}

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
