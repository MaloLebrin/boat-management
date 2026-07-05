import {
  InvoiceNotFoundError,
  NotAQuoteError,
  QuoteAlreadyConvertedError,
  CannotMarkPaidError,
} from '#exceptions/invoice_errors'
import BoatReservation from '#models/boat_reservation'
import Client from '#models/client'
import Invoice from '#models/invoice'
import InvoiceCounter from '#models/invoice_counter'
import InvoiceLine from '#models/invoice_line'
import type Organization from '#models/organization'
import { computeInvoiceTotals } from '#shared/helpers/invoice_totals'
import { toDateTime } from '#shared/helpers/date'
import type {
  InvoiceListFilters,
  InvoiceKind,
  InvoiceStatus,
  InvoiceSortField,
  InvoiceSortDirection,
  InvoicesPaginated,
  InvoiceLineInput,
  InvoiceLink,
} from '#shared/types/invoice'
import type { ClientOption } from '#shared/types/client'
import { toInvoiceRow } from '#transformers/invoice_transformer'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

export { InvoiceNotFoundError, NotAQuoteError, QuoteAlreadyConvertedError, CannotMarkPaidError }

/**
 * Internal payload types that accept DateTime from VineJS validators.
 * The shared types use strings for frontend compatibility.
 */
interface ServiceCreateInvoicePayload {
  kind: InvoiceKind
  clientId?: number | null
  reservationId?: number | null
  status?: InvoiceStatus
  issuedAt: Date | string | DateTime
  dueAt?: Date | string | DateTime | null
  taxRate: number
  currency?: string
  notes?: string | null
  lines: InvoiceLineInput[]
}

type ServiceUpdateInvoicePayload = ServiceCreateInvoicePayload

const VALID_STATUSES: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled']
const VALID_KINDS: InvoiceKind[] = ['quote', 'invoice']
const VALID_SORT_FIELDS: InvoiceSortField[] = ['issuedAt', 'number', 'total', 'status']
const VALID_DIRECTIONS: InvoiceSortDirection[] = ['asc', 'desc']

function toTrimmedStringOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function toIntegerOrUndefined(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normalizeStatus(value: unknown): InvoiceStatus | '' {
  if (typeof value === 'string' && VALID_STATUSES.includes(value as InvoiceStatus)) {
    return value as InvoiceStatus
  }
  return ''
}

function normalizeKind(value: unknown): InvoiceKind | '' {
  if (typeof value === 'string' && VALID_KINDS.includes(value as InvoiceKind)) {
    return value as InvoiceKind
  }
  return ''
}

function normalizeSort(value: unknown): InvoiceSortField {
  if (typeof value === 'string' && VALID_SORT_FIELDS.includes(value as InvoiceSortField)) {
    return value as InvoiceSortField
  }
  return 'issuedAt'
}

function normalizeDirection(value: unknown): InvoiceSortDirection {
  if (typeof value === 'string' && VALID_DIRECTIONS.includes(value as InvoiceSortDirection)) {
    return value as InvoiceSortDirection
  }
  return 'desc'
}

function normalizeDateString(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  // Basic YYYY-MM-DD validation
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return ''
  return trimmed
}

function mapSortColumn(sort: InvoiceSortField): string {
  switch (sort) {
    case 'issuedAt':
      return 'issued_at'
    case 'number':
      return 'number'
    case 'total':
      return 'total'
    case 'status':
      return 'status'
  }
}

@inject()
export default class InvoiceService {
  normalizeFilters(qs: Record<string, unknown>): InvoiceListFilters {
    const q = toTrimmedStringOrUndefined(qs.q) ?? ''
    const status = normalizeStatus(qs.status)
    const kind = normalizeKind(qs.kind)
    const clientId = toIntegerOrUndefined(qs.clientId) ?? null
    const issuedFrom = normalizeDateString(qs.issuedFrom)
    const issuedTo = normalizeDateString(qs.issuedTo)
    const sort = normalizeSort(qs.sort)
    const direction = normalizeDirection(qs.direction)
    const page = clampInt(toIntegerOrUndefined(qs.page) ?? 1, 1, 10_000)
    const perPage = clampInt(toIntegerOrUndefined(qs.perPage) ?? 20, 1, 100)

    return { q, status, kind, clientId, issuedFrom, issuedTo, sort, direction, page, perPage }
  }

  async search(org: Organization, filters: InvoiceListFilters): Promise<InvoicesPaginated> {
    const query = Invoice.query().where('organizationId', org.id)

    if (filters.status) {
      query.where('status', filters.status)
    }

    if (filters.kind) {
      query.where('kind', filters.kind)
    }

    if (filters.clientId !== null) {
      query.where('clientId', filters.clientId)
    }

    if (filters.q) {
      const needle = `%${filters.q}%`
      query.where((sub) => {
        sub.whereILike('number', needle).orWhereILike('client_name', needle)
      })
    }

    if (filters.issuedFrom) {
      query.where('issuedAt', '>=', filters.issuedFrom)
    }

    if (filters.issuedTo) {
      query.where('issuedAt', '<=', filters.issuedTo)
    }

    query.orderBy(mapSortColumn(filters.sort), filters.direction).orderBy('id', 'desc')

    const paginator = await query.paginate(filters.page, filters.perPage)

    return {
      data: paginator.all().map((invoice) => toInvoiceRow(invoice)),
      meta: {
        total: paginator.total,
        perPage: paginator.perPage,
        currentPage: paginator.currentPage,
        lastPage: paginator.lastPage,
      },
    }
  }

  async getForOrganizationOrFail(org: Organization, id: number): Promise<Invoice> {
    const invoice = await Invoice.query()
      .where('id', id)
      .where('organizationId', org.id)
      .preload('lines', (q) => q.orderBy('position'))
      .preload('client')
      .preload('reservation')
      .first()

    if (!invoice) throw new InvoiceNotFoundError()
    return invoice
  }

  /**
   * Returns the quotes/invoices linked to each reservation id, grouped by
   * reservation id. Used to surface the reservation ↔ document link on the
   * reservations list. Org-scoped.
   */
  async listLinksByReservationIds(
    organizationId: number,
    reservationIds: number[]
  ): Promise<Map<number, InvoiceLink[]>> {
    const map = new Map<number, InvoiceLink[]>()
    if (reservationIds.length === 0) return map

    const invoices = await Invoice.query()
      .where('organizationId', organizationId)
      .whereIn('reservationId', reservationIds)
      .orderBy('id', 'asc')

    for (const invoice of invoices) {
      if (invoice.reservationId === null) continue
      const list = map.get(invoice.reservationId) ?? []
      list.push({ id: invoice.id, number: invoice.number })
      map.set(invoice.reservationId, list)
    }
    return map
  }

  /**
   * Resolves the linked documents for an invoice: its origin quote (when the
   * invoice was converted from one) and the invoice it was converted into (when
   * this document is a quote). `invoices` is self-referential via `sourceQuoteId`
   * but Lucid can't type a self-relation for `preload`, so these are fetched
   * explicitly, org-scoped.
   */
  async getLinks(
    invoice: Invoice
  ): Promise<{ sourceQuote: Invoice | null; convertedInvoice: Invoice | null }> {
    const sourceQuote = invoice.sourceQuoteId
      ? await Invoice.query()
          .where('id', invoice.sourceQuoteId)
          .where('organizationId', invoice.organizationId)
          .first()
      : null

    const convertedInvoice = await Invoice.query()
      .where('sourceQuoteId', invoice.id)
      .where('organizationId', invoice.organizationId)
      .first()

    return { sourceQuote, convertedInvoice }
  }

  async listClientOptions(org: Organization): Promise<ClientOption[]> {
    const clients = await Client.query()
      .where('organizationId', org.id)
      .orderBy('last_name', 'asc')
      .orderBy('first_name', 'asc')
      .select('id', 'first_name', 'last_name', 'status')

    return clients.map((c) => ({ id: c.id, fullName: c.fullName, status: c.status }))
  }

  async create(org: Organization, payload: ServiceCreateInvoicePayload): Promise<Invoice> {
    return db.transaction(async (trx) => {
      // Allocate gap-free number
      const number = await this.#allocateNumber(trx, org.id, payload.kind)

      // Compute totals
      const totals = computeInvoiceTotals(payload.lines, payload.taxRate)

      // Resolve client/reservation against the org (ignore any cross-org id) and
      // snapshot the client name.
      const { clientId, clientName } = await this.#resolveClient(trx, org.id, payload.clientId)
      const reservationId = await this.#resolveReservationId(trx, org.id, payload.reservationId)

      const invoice = await Invoice.create(
        {
          organizationId: org.id,
          clientId,
          reservationId,
          kind: payload.kind,
          number,
          clientName,
          status: payload.status ?? 'draft',
          issuedAt: toDateTime(payload.issuedAt),
          dueAt: payload.dueAt ? toDateTime(payload.dueAt) : null,
          subtotal: String(totals.subtotal),
          taxRate: String(payload.taxRate),
          taxAmount: String(totals.taxAmount),
          total: String(totals.total),
          currency: payload.currency ?? 'EUR',
          notes: payload.notes?.trim() || null,
        },
        { client: trx }
      )

      await InvoiceLine.createMany(
        payload.lines.map((line, index) => ({
          invoiceId: invoice.id,
          label: line.label.trim(),
          quantity: String(line.quantity),
          unitPrice: String(line.unitPrice),
          amount: String(totals.lines[index].amount),
          position: index,
        })),
        { client: trx }
      )

      await invoice.load('lines')
      await invoice.load('client')

      return invoice
    })
  }

  async update(invoice: Invoice, payload: ServiceUpdateInvoicePayload): Promise<Invoice> {
    return db.transaction(async (trx) => {
      // Compute totals
      const totals = computeInvoiceTotals(payload.lines, payload.taxRate)

      // Resolve client/reservation against the org (ignore any cross-org id) and
      // re-snapshot the client name.
      const { clientId, clientName } = await this.#resolveClient(
        trx,
        invoice.organizationId,
        payload.clientId
      )
      const reservationId = await this.#resolveReservationId(
        trx,
        invoice.organizationId,
        payload.reservationId
      )

      // Update invoice (NEVER reassign number or kind)
      invoice.useTransaction(trx)
      invoice.clientId = clientId
      invoice.reservationId = reservationId
      invoice.clientName = clientName
      invoice.status = payload.status ?? invoice.status
      invoice.issuedAt = toDateTime(payload.issuedAt)
      invoice.dueAt = payload.dueAt ? toDateTime(payload.dueAt) : null
      invoice.subtotal = String(totals.subtotal)
      invoice.taxRate = String(payload.taxRate)
      invoice.taxAmount = String(totals.taxAmount)
      invoice.total = String(totals.total)
      invoice.currency = payload.currency ?? invoice.currency
      invoice.notes = payload.notes?.trim() || null
      await invoice.save()

      // Delete old lines and create new ones
      await InvoiceLine.query({ client: trx }).where('invoiceId', invoice.id).delete()

      await InvoiceLine.createMany(
        payload.lines.map((line, index) => ({
          invoiceId: invoice.id,
          label: line.label.trim(),
          quantity: String(line.quantity),
          unitPrice: String(line.unitPrice),
          amount: String(totals.lines[index].amount),
          position: index,
        })),
        { client: trx }
      )

      await invoice.load('lines')
      await invoice.load('client')

      return invoice
    })
  }

  async delete(invoice: Invoice): Promise<void> {
    await invoice.delete()
  }

  /**
   * Converts an accepted quote into a brand-new invoice: a fresh `FAC-` number,
   * the quote's client snapshot / reservation / lines / tax rate copied over,
   * `sourceQuoteId` linking back to the origin quote, status reset to `draft`.
   *
   * A quote can only be converted once. Guards against converting a document that
   * is not a quote, or one that already has a converted invoice.
   */
  async convertToInvoice(quote: Invoice): Promise<Invoice> {
    if (quote.kind !== 'quote') throw new NotAQuoteError()

    const existing = await Invoice.query()
      .where('sourceQuoteId', quote.id)
      .where('organizationId', quote.organizationId)
      .first()
    if (existing) throw new QuoteAlreadyConvertedError()

    await quote.load('lines', (q) => q.orderBy('position'))

    return db.transaction(async (trx) => {
      const number = await this.#allocateNumber(trx, quote.organizationId, 'invoice')

      const invoice = await Invoice.create(
        {
          organizationId: quote.organizationId,
          clientId: quote.clientId,
          reservationId: quote.reservationId,
          sourceQuoteId: quote.id,
          kind: 'invoice',
          number,
          clientName: quote.clientName,
          status: 'draft',
          issuedAt: DateTime.now(),
          dueAt: null,
          paidAt: null,
          subtotal: quote.subtotal,
          taxRate: quote.taxRate,
          taxAmount: quote.taxAmount,
          total: quote.total,
          currency: quote.currency,
          notes: quote.notes,
        },
        { client: trx }
      )

      await InvoiceLine.createMany(
        quote.lines.map((line, index) => ({
          invoiceId: invoice.id,
          label: line.label,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          amount: line.amount,
          position: index,
        })),
        { client: trx }
      )

      await invoice.load('lines')
      await invoice.load('client')

      return invoice
    })
  }

  /**
   * Builds a draft quote pre-filled from a reservation: links `reservationId`,
   * resolves the client by the reservation's snapshot email (falling back to the
   * free-text `clientName` when no client record matches), and adds a single line
   * priced from the reservation total. The line label is supplied by the caller
   * (built with i18n). The reservation total already reflects pricing (#284) when
   * available, otherwise the manually entered `totalPrice`.
   */
  async createQuoteFromReservation(
    org: Organization,
    reservation: BoatReservation,
    opts: { lineLabel: string }
  ): Promise<Invoice> {
    return db.transaction(async (trx) => {
      const number = await this.#allocateNumber(trx, org.id, 'quote')

      // Resolve the client by the reservation's snapshot email; keep the
      // free-text name as the invoice snapshot when no record matches.
      let clientId: number | null = null
      let clientName: string | null = reservation.clientName || null
      if (reservation.clientEmail) {
        const client = await Client.query({ client: trx })
          .where('organizationId', org.id)
          .where('email', reservation.clientEmail)
          .first()
        if (client) {
          clientId = client.id
          clientName = client.fullName
        }
      }

      const unitPrice = reservation.totalPrice ? Number.parseFloat(reservation.totalPrice) : 0
      const lines: InvoiceLineInput[] = [{ label: opts.lineLabel, quantity: 1, unitPrice }]
      const totals = computeInvoiceTotals(lines, 0)

      const invoice = await Invoice.create(
        {
          organizationId: org.id,
          clientId,
          reservationId: reservation.id,
          kind: 'quote',
          number,
          clientName,
          status: 'draft',
          issuedAt: DateTime.now(),
          dueAt: null,
          paidAt: null,
          subtotal: String(totals.subtotal),
          taxRate: '0',
          taxAmount: String(totals.taxAmount),
          total: String(totals.total),
          currency: 'EUR',
          notes: null,
        },
        { client: trx }
      )

      await InvoiceLine.createMany(
        lines.map((line, index) => ({
          invoiceId: invoice.id,
          label: line.label,
          quantity: String(line.quantity),
          unitPrice: String(line.unitPrice),
          amount: String(totals.lines[index].amount),
          position: index,
        })),
        { client: trx }
      )

      await invoice.load('lines')
      await invoice.load('client')

      return invoice
    })
  }

  /**
   * Marks an invoice as paid, stamping `paidAt`. Only real invoices that are not
   * cancelled can be marked paid.
   */
  async markAsPaid(invoice: Invoice, paidAt?: DateTime): Promise<Invoice> {
    if (invoice.kind !== 'invoice' || invoice.status === 'cancelled') {
      throw new CannotMarkPaidError()
    }

    invoice.status = 'paid'
    invoice.paidAt = paidAt ?? DateTime.now()
    await invoice.save()
    return invoice
  }

  /**
   * Flips every `sent` invoice whose due date has passed and that is still unpaid
   * to the `overdue` status. Returns the number of invoices updated. Idempotent —
   * safe to run daily from the scheduler.
   */
  async markOverdueInvoices(now: DateTime = DateTime.now()): Promise<number> {
    const today = now.toISODate()
    if (!today) return 0

    const rows = await Invoice.query()
      .where('kind', 'invoice')
      .where('status', 'sent')
      .whereNull('paidAt')
      .whereNotNull('dueAt')
      .where('dueAt', '<', today)
      .update({ status: 'overdue' })

    // Lucid's update() returns the affected-row count in an array-ish shape.
    return Array.isArray(rows) ? Number(rows[0] ?? 0) : Number(rows ?? 0)
  }

  /**
   * Resolves a client id against the organization: returns the id + snapshot name
   * only when the client belongs to the org, otherwise `{ clientId: null }`.
   * Prevents attaching an invoice to another organization's client.
   */
  async #resolveClient(
    trx: TransactionClientContract,
    organizationId: number,
    clientId: number | null | undefined
  ): Promise<{ clientId: number | null; clientName: string | null }> {
    if (!clientId) return { clientId: null, clientName: null }

    const client = await Client.query({ client: trx })
      .where('id', clientId)
      .where('organizationId', organizationId)
      .first()

    return client
      ? { clientId: client.id, clientName: client.fullName }
      : { clientId: null, clientName: null }
  }

  /**
   * Resolves a reservation id against the organization: returns it only when the
   * reservation belongs to the org, otherwise `null`.
   */
  async #resolveReservationId(
    trx: TransactionClientContract,
    organizationId: number,
    reservationId: number | null | undefined
  ): Promise<number | null> {
    if (!reservationId) return null

    const reservation = await BoatReservation.query({ client: trx })
      .where('id', reservationId)
      .where('organizationId', organizationId)
      .first()

    return reservation ? reservation.id : null
  }

  async #allocateNumber(
    trx: TransactionClientContract,
    organizationId: number,
    kind: InvoiceKind
  ): Promise<string> {
    // Ensure counter row exists (INSERT ... ON CONFLICT IGNORE)
    await db
      .table('invoice_counters')
      .useTransaction(trx)
      .insert({
        organization_id: organizationId,
        kind,
        last_number: 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflict(['organization_id', 'kind'])
      .ignore()

    // Lock and increment
    const counter = await InvoiceCounter.query({ client: trx })
      .where('organizationId', organizationId)
      .where('kind', kind)
      .forUpdate()
      .firstOrFail()

    const next = counter.lastNumber + 1
    counter.lastNumber = next
    await counter.save()

    const prefix = kind === 'quote' ? 'DEV-' : 'FAC-'
    return `${prefix}${String(next).padStart(6, '0')}`
  }
}
