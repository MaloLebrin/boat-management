import {
  InvoiceNotFoundError,
  NotAQuoteError,
  QuoteAlreadyConvertedError,
  CannotMarkPaidError,
  InvoiceLockedError,
  CannotEditPaymentError,
} from '#exceptions/invoice_errors'
import BoatReservation from '#models/boat_reservation'
import Client from '#models/client'
import Invoice from '#models/invoice'
import InvoiceCounter from '#models/invoice_counter'
import InvoiceLine from '#models/invoice_line'
import type Organization from '#models/organization'
import { computeInvoiceTotals } from '#shared/helpers/invoice_totals'
import { canEditInvoice, canEditInvoicePayment } from '#shared/helpers/invoice_lifecycle'
import { toDateTime } from '#shared/helpers/date'
import {
  clampInt,
  normalizeEnum,
  toIntegerOrUndefined,
  toTrimmedStringOrUndefined,
} from '#shared/helpers/query'
import type {
  InvoiceListFilters,
  InvoicePaymentMethod,
  InvoiceKind,
  InvoiceStatus,
  InvoiceSortField,
  InvoiceSortDirection,
  InvoicesPaginated,
  InvoiceLineInput,
  InvoiceLink,
} from '#shared/types/invoice'
import type { ClientOption } from '#shared/types/client'
import type { DashboardInvoicingSummary } from '#shared/types/dashboard'
import { toInvoiceRow } from '#transformers/invoice_transformer'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

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

interface ServiceUpdatePaymentPayload {
  paidAt?: Date | string | DateTime | null
  paymentMethod?: InvoicePaymentMethod | null
}

const VALID_STATUSES: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled']
const VALID_KINDS: InvoiceKind[] = ['quote', 'invoice']
const VALID_SORT_FIELDS: InvoiceSortField[] = ['issuedAt', 'number', 'total', 'status']
const VALID_DIRECTIONS: InvoiceSortDirection[] = ['asc', 'desc']

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
    const status = normalizeEnum(qs.status, VALID_STATUSES, '' as const)
    const kind = normalizeEnum(qs.kind, VALID_KINDS, '' as const)
    const clientId = toIntegerOrUndefined(qs.clientId) ?? null
    const issuedFrom = normalizeDateString(qs.issuedFrom)
    const issuedTo = normalizeDateString(qs.issuedTo)
    const sort = normalizeEnum(qs.sort, VALID_SORT_FIELDS, 'issuedAt' as const)
    const direction = normalizeEnum(qs.direction, VALID_DIRECTIONS, 'desc' as const)
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

  /**
   * Widget « Facturation » : encours (envoyées non réglées), impayées (statut
   * `overdue` **ou** envoyée avec échéance dépassée — même règle que
   * « À traiter », le job de bascule ne passant qu'une fois par jour), encaissé
   * depuis le 1er du mois et devis en attente. Un seul agrégat conditionnel.
   * Ne renvoie jamais `null` (#478).
   */
  async getDashboardSummary(
    org: Organization,
    now: DateTime = DateTime.now()
  ): Promise<DashboardInvoicingSummary> {
    const today = now.toISODate()!
    const monthStart = now.startOf('month').toISO()!
    const overdueWhere =
      "kind = 'invoice' and (status = 'overdue' or (status = 'sent' and due_at < ?))"
    const paidWhere = "kind = 'invoice' and status = 'paid' and paid_at >= ?"
    const outstandingWhere = "kind = 'invoice' and status in ('sent', 'overdue')"

    const row = await db
      .from('invoices')
      .where('organization_id', org.id)
      .select(
        db.raw(`coalesce(sum(total) filter (where ${outstandingWhere}), 0) as outstanding_total`)
      )
      .select(db.raw(`count(*) filter (where ${outstandingWhere})::int as outstanding_count`))
      .select(
        db.raw(`coalesce(sum(total) filter (where ${overdueWhere}), 0) as overdue_total`, [today])
      )
      .select(db.raw(`count(*) filter (where ${overdueWhere})::int as overdue_count`, [today]))
      .select(
        db.raw(`coalesce(sum(total) filter (where ${paidWhere}), 0) as paid_total`, [monthStart])
      )
      .select(db.raw(`count(*) filter (where ${paidWhere})::int as paid_count`, [monthStart]))
      .select(
        db.raw(
          "count(*) filter (where kind = 'quote' and status in ('draft', 'sent'))::int as pending_quotes"
        )
      )
      .first()

    const money = (value: unknown) =>
      Math.round(Number.parseFloat(String(value ?? '0')) * 100) / 100

    return {
      outstandingTotal: money(row?.outstanding_total),
      outstandingCount: Number(row?.outstanding_count ?? 0),
      overdueTotal: money(row?.overdue_total),
      overdueCount: Number(row?.overdue_count ?? 0),
      paidThisMonthTotal: money(row?.paid_total),
      paidThisMonthCount: Number(row?.paid_count ?? 0),
      pendingQuotes: Number(row?.pending_quotes ?? 0),
    }
  }

  /**
   * Vrai si l'organisation a au moins un devis/facture. Autorise l'accès en
   * lecture seule après résiliation du module Facturation (#332, lot 5b) — les
   * documents émis restent consultables/exportables (obligation légale).
   */
  async hasAnyForOrg(organizationId: number): Promise<boolean> {
    const row = await Invoice.query().where('organizationId', organizationId).select('id').first()
    return row !== null
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

  /**
   * Réécriture complète d'un document. Refusée sur une **facture émise** (#717) :
   * une pièce comptable sortie du brouillon ne se réécrit pas — ni ses montants,
   * ni sa date d'émission, ni son statut. Seul son paiement reste modifiable,
   * via `updatePayment`.
   */
  async update(invoice: Invoice, payload: ServiceUpdateInvoicePayload): Promise<Invoice> {
    if (!canEditInvoice(invoice)) throw new InvoiceLockedError()

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
      // `paid_at` suit le statut, toujours : un document qui n'est pas payé ne
      // porte aucune date de paiement, et un document qui bascule en `paid` par
      // le formulaire est horodaté (#717).
      if (invoice.status === 'paid') {
        invoice.paidAt = invoice.paidAt ?? DateTime.now()
      } else {
        invoice.paidAt = null
        invoice.paymentMethod = null
      }
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

      // Resolve the client: prefer the reservation's linked client FK (#275),
      // fall back to matching the snapshot email (#288). Keep the free-text name
      // as the invoice snapshot when no client record matches.
      let clientId: number | null = null
      let clientName: string | null = reservation.clientName || null
      let client: Client | null = null
      if (reservation.clientId) {
        client = await Client.query({ client: trx })
          .where('id', reservation.clientId)
          .where('organizationId', org.id)
          .first()
      }
      if (!client && reservation.clientEmail) {
        client = await Client.query({ client: trx })
          .where('organizationId', org.id)
          .where('email', reservation.clientEmail)
          .first()
      }
      if (client) {
        clientId = client.id
        clientName = client.fullName
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
   * La seule écriture qu'une facture émise accepte encore (#717) : sa date et son
   * moyen de paiement. Le statut suit la date pour que l'invariant
   * `paid_at is not null ⇔ status = 'paid'` tienne —
   *
   * - une date posée règle la facture (`status = 'paid'`) ;
   * - une date effacée la remet à `sent` (le job quotidien la rebasculera en
   *   `overdue` si l'échéance est passée).
   *
   * Refusée sur un devis, un brouillon (qui passe par le formulaire d'édition)
   * et une facture annulée, qui n'encaisse rien.
   */
  async updatePayment(invoice: Invoice, payload: ServiceUpdatePaymentPayload): Promise<Invoice> {
    if (!canEditInvoicePayment(invoice)) throw new CannotEditPaymentError()

    const paidAt = payload.paidAt ? toDateTime(payload.paidAt) : null

    invoice.paidAt = paidAt
    invoice.status = paidAt ? 'paid' : 'sent'
    // Clé absente = champ non soumis : le moyen déjà enregistré est conservé.
    // Un paiement annulé, lui, n'en garde aucun.
    invoice.paymentMethod = paidAt
      ? payload.paymentMethod === undefined
        ? invoice.paymentMethod
        : payload.paymentMethod
      : null
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
