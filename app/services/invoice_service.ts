import { InvoiceNotFoundError } from '#exceptions/invoice_errors'
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
} from '#shared/types/invoice'
import type { ClientOption } from '#shared/types/client'
import { toInvoiceRow } from '#transformers/invoice_transformer'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

export { InvoiceNotFoundError }

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
      .first()

    if (!invoice) throw new InvoiceNotFoundError()
    return invoice
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
      const number = await this.#allocateNumber(trx, org, payload.kind)

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
    org: Organization,
    kind: InvoiceKind
  ): Promise<string> {
    // Ensure counter row exists (INSERT ... ON CONFLICT IGNORE)
    await db
      .table('invoice_counters')
      .useTransaction(trx)
      .insert({
        organization_id: org.id,
        kind,
        last_number: 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflict(['organization_id', 'kind'])
      .ignore()

    // Lock and increment
    const counter = await InvoiceCounter.query({ client: trx })
      .where('organizationId', org.id)
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
