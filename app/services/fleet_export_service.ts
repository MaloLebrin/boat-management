import BoatReservation from '#models/boat_reservation'
import Client from '#models/client'
import Invoice from '#models/invoice'
import InvoiceLine from '#models/invoice_line'
import type Organization from '#models/organization'
import type User from '#models/user'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import { buildCsv } from '#services/csv_export_service'
import FecService from '#services/fec_service'
import type {
  ClientExportParams,
  ExportFile,
  ExportPeriod,
  FecExportParams,
  FleetExportParams,
  FleetExportType,
  InvoiceExportParams,
  MaintenanceHistoryExportParams,
  ReservationExportParams,
} from '#shared/types/export'
import { inject } from '@adonisjs/core'
import type { I18n } from '@adonisjs/i18n'
import type { LucidModel, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'

/**
 * Exports flotte (#879) : une ligne par entité de toute l'organisation, avec
 * une période. Chaque type sait se **compter** (le contrôleur décide alors
 * s'il répond tout de suite ou s'il passe par le job `GenerateExport`) et se
 * **construire** — la même fonction sert aux deux chemins.
 *
 * Le journal des ventes porte les avoirs **en négatif** : les colonnes se
 * somment et donnent le chiffre d'affaires net de la période.
 */

export interface FleetExportContext {
  org: Organization
  user: User
}

function amount(value: string | null, sign = 1): string {
  if (value === null) return ''
  return (Number.parseFloat(value) * sign).toFixed(2)
}

function isoDate(value: DateTime | null): string {
  return value?.toISODate() ?? ''
}

/** Lendemain d'une borne `to` incluse, pour comparer un horodatage. */
function dayAfter(isoDay: string): string {
  return DateTime.fromISO(isoDay).plus({ days: 1 }).toISODate()!
}

/** `sales-journal_2026-01-01_2026-03-31.csv`, ou la date du jour sans période. */
export function fleetExportFilename(base: string, period: ExportPeriod | null): string {
  const today = DateTime.now().toISODate()
  const from = period?.from ?? null
  const to = period?.to ?? null
  if (from === null && to === null) return `${base}_${today}.csv`
  return `${base}_${from ?? 'start'}_${to ?? today}.csv`
}

function csvFile(
  base: string,
  period: ExportPeriod | null,
  headers: string[],
  rows: (string | number | null)[][]
): ExportFile {
  return {
    filename: fleetExportFilename(base, period),
    contentType: 'text/csv; charset=utf-8',
    buffer: buildCsv(headers, rows),
    rowCount: rows.length,
  }
}

async function countOf<Model extends LucidModel>(
  query: ModelQueryBuilderContract<Model>
): Promise<number> {
  const [row] = await query.count('* as total').pojo<{ total: number | string }>()
  return Number(row?.total ?? 0)
}

@inject()
export default class FleetExportService {
  constructor(
    private fecService: FecService,
    private maintenanceService: BoatMaintenanceService
  ) {}

  // ---------------------------------------------------------------------------
  // Journal des ventes
  // ---------------------------------------------------------------------------

  #invoicesQuery(organizationId: number, params: InvoiceExportParams) {
    const query = Invoice.query()
      .where('organizationId', organizationId)
      .whereIn('kind', params.kind ? [params.kind] : ['invoice', 'credit_note'])
      .whereNot('status', 'draft')
    if (params.status) query.where('status', params.status)
    if (params.from) query.where('issuedAt', '>=', params.from)
    if (params.to) query.where('issuedAt', '<=', params.to)
    return query
  }

  async #creditedNumbers(invoices: Invoice[]): Promise<Map<number, string>> {
    const ids = [...new Set(invoices.map((i) => i.creditedInvoiceId))].filter(
      (id): id is number => id !== null
    )
    if (ids.length === 0) return new Map()
    const rows = await Invoice.query().whereIn('id', ids).select(['id', 'number'])
    return new Map(rows.map((row) => [row.id, row.number]))
  }

  async #buildInvoices(org: Organization, params: InvoiceExportParams, i18n: I18n) {
    const invoices = await this.#invoicesQuery(org.id, params)
      .select([
        'id',
        'kind',
        'number',
        'status',
        'issuedAt',
        'dueAt',
        'paidAt',
        'paymentMethod',
        'clientName',
        'creditedInvoiceId',
        'subtotal',
        'taxRate',
        'taxAmount',
        'total',
        'currency',
      ])
      .orderBy('issuedAt', 'asc')
      .orderBy('number', 'asc')
    const credited = await this.#creditedNumbers(invoices)

    const headers = [
      'number',
      'kind',
      'issuedAt',
      'dueAt',
      'client',
      'creditedInvoice',
      'subtotal',
      'taxRate',
      'taxAmount',
      'total',
      'currency',
      'status',
      'paidAt',
      'paymentMethod',
    ].map((column) => i18n.t(`csv.invoices.${column}`))

    const rows = invoices.map((invoice) => {
      const sign = invoice.kind === 'credit_note' ? -1 : 1
      return [
        invoice.number,
        i18n.t(`invoices.kind.${invoice.kind}`),
        isoDate(invoice.issuedAt),
        isoDate(invoice.dueAt),
        invoice.clientName ?? '',
        invoice.creditedInvoiceId === null ? '' : (credited.get(invoice.creditedInvoiceId) ?? ''),
        amount(invoice.subtotal, sign),
        Number.parseFloat(invoice.taxRate).toFixed(2),
        amount(invoice.taxAmount, sign),
        amount(invoice.total, sign),
        invoice.currency,
        i18n.t(`invoices.status.${invoice.status}`),
        isoDate(invoice.paidAt),
        invoice.paymentMethod ? i18n.t(`invoices.paymentMethods.${invoice.paymentMethod}`) : '',
      ]
    })
    return csvFile('sales-journal', params, headers, rows)
  }

  #invoiceLinesQuery(organizationId: number, params: InvoiceExportParams) {
    return InvoiceLine.query().whereIn(
      'invoiceId',
      this.#invoicesQuery(organizationId, params).select('id')
    )
  }

  async #buildInvoiceLines(org: Organization, params: InvoiceExportParams, i18n: I18n) {
    const invoices = await this.#invoicesQuery(org.id, params)
      .select(['id', 'kind', 'number', 'issuedAt', 'clientName', 'taxRate', 'currency'])
      .preload('lines', (q) =>
        q.select(['id', 'invoiceId', 'label', 'quantity', 'unitPrice', 'amount', 'position'])
      )
      .orderBy('issuedAt', 'asc')
      .orderBy('number', 'asc')

    const headers = [
      'number',
      'kind',
      'issuedAt',
      'client',
      'label',
      'quantity',
      'unitPrice',
      'amount',
      'taxRate',
      'currency',
    ].map((column) => i18n.t(`csv.invoiceLines.${column}`))

    const rows: string[][] = []
    for (const invoice of invoices) {
      const sign = invoice.kind === 'credit_note' ? -1 : 1
      const lines = [...invoice.lines].sort((a, b) => a.position - b.position)
      for (const line of lines) {
        rows.push([
          invoice.number,
          i18n.t(`invoices.kind.${invoice.kind}`),
          isoDate(invoice.issuedAt),
          invoice.clientName ?? '',
          line.label,
          line.quantity,
          amount(line.unitPrice),
          amount(line.amount, sign),
          Number.parseFloat(invoice.taxRate).toFixed(2),
          invoice.currency,
        ])
      }
    }
    return csvFile('sales-journal-lines', params, headers, rows)
  }

  // ---------------------------------------------------------------------------
  // Réservations
  // ---------------------------------------------------------------------------

  /** Réservations qui **chevauchent** la période. */
  #reservationsQuery(organizationId: number, params: ReservationExportParams) {
    const query = BoatReservation.query().where('organizationId', organizationId)
    if (params.boatId) query.where('boatId', params.boatId)
    if (params.status) query.where('status', params.status)
    if (params.paymentStatus) query.where('paymentStatus', params.paymentStatus)
    if (params.from) query.where('endsAt', '>=', params.from)
    if (params.to) query.where('startsAt', '<', dayAfter(params.to))
    return query
  }

  async #buildReservations(org: Organization, params: ReservationExportParams, i18n: I18n) {
    const reservations = await this.#reservationsQuery(org.id, params)
      .select([
        'id',
        'boatId',
        'type',
        'status',
        'startsAt',
        'endsAt',
        'clientName',
        'clientEmail',
        'clientPhone',
        'totalPrice',
        'depositAmount',
        'paidAmount',
        'paymentStatus',
        'paymentMethod',
        'depositPaidAt',
        'balancePaidAt',
        'securityDepositAmount',
        'securityDepositStatus',
      ])
      .preload('boat', (q) => q.select(['id', 'name']))
      .orderBy('startsAt', 'asc')
      .orderBy('id', 'asc')

    const headers = [
      'boat',
      'type',
      'status',
      'startsAt',
      'endsAt',
      'client',
      'email',
      'phone',
      'totalPrice',
      'depositAmount',
      'paidAmount',
      'paymentStatus',
      'paymentMethod',
      'depositPaidAt',
      'balancePaidAt',
      'securityDepositAmount',
      'securityDepositStatus',
    ].map((column) => i18n.t(`csv.reservations.${column}`))

    const rows = reservations.map((r) => [
      r.boat?.name ?? '',
      r.type ? i18n.t(`reservations.types.${r.type}`) : '',
      i18n.t(`reservations.status.${r.status}`),
      r.startsAt.toISO() ?? '',
      r.endsAt.toISO() ?? '',
      r.clientName,
      r.clientEmail ?? '',
      r.clientPhone ?? '',
      amount(r.totalPrice),
      amount(r.depositAmount),
      amount(r.paidAmount),
      i18n.t(`reservations.payment.status.${r.paymentStatus}`),
      r.paymentMethod ? i18n.t(`reservations.payment.methods.${r.paymentMethod}`) : '',
      isoDate(r.depositPaidAt),
      isoDate(r.balancePaidAt),
      amount(r.securityDepositAmount),
      i18n.t(`reservations.payment.securityDeposit.status.${r.securityDepositStatus}`),
    ])
    return csvFile('reservations', params, headers, rows)
  }

  // ---------------------------------------------------------------------------
  // Clients
  // ---------------------------------------------------------------------------

  /** Fiches créées sur la période, hors clients anonymisés (RGPD). */
  #clientsQuery(organizationId: number, params: ClientExportParams) {
    const query = Client.query().where('organizationId', organizationId).whereNull('anonymizedAt')
    if (params.from) query.where('createdAt', '>=', params.from)
    if (params.to) query.where('createdAt', '<', dayAfter(params.to))
    return query
  }

  async #buildClients(org: Organization, params: ClientExportParams, i18n: I18n) {
    const clients = await this.#clientsQuery(org.id, params)
      .select([
        'id',
        'lastName',
        'firstName',
        'email',
        'phone',
        'address',
        'navigationPermitNumber',
        'navigationPermitType',
        'status',
        'gdprConsentAt',
        'createdAt',
      ])
      .orderBy('lastName', 'asc')
      .orderBy('firstName', 'asc')
      .orderBy('id', 'asc')

    const headers = [
      'lastName',
      'firstName',
      'email',
      'phone',
      'address',
      'permitNumber',
      'permitType',
      'status',
      'gdprConsentAt',
      'createdAt',
    ].map((column) => i18n.t(`csv.clients.${column}`))

    const rows = clients.map((c) => [
      c.lastName,
      c.firstName,
      c.email ?? '',
      c.phone ?? '',
      c.address ?? '',
      c.navigationPermitNumber ?? '',
      c.navigationPermitType ?? '',
      i18n.t(`clients.status.${c.status}`),
      isoDate(c.gdprConsentAt),
      isoDate(c.createdAt),
    ])
    return csvFile('clients', params, headers, rows)
  }

  // ---------------------------------------------------------------------------
  // Historique de maintenance de la flotte
  // ---------------------------------------------------------------------------

  /**
   * Filtres de l'écran `/maintenance/history` (query string), normalisés
   * comme pour la page et son PDF — une valeur inconnue est ignorée.
   */
  normalizeHistoryFilters(raw: Record<string, unknown>) {
    const filters = this.maintenanceService.normalizeHistoryQuery(raw)
    return {
      q: filters.q,
      subject: filters.subject,
      boatId: filters.boatId,
      dateFrom: filters.dateFrom || null,
      dateTo: filters.dateTo || null,
    }
  }

  /** Mêmes filtres que l'écran `/maintenance/history` et son PDF. */
  #historyQuery(params: MaintenanceHistoryExportParams): Record<string, unknown> {
    return {
      q: params.q,
      subject: params.subject,
      boatId: params.boatId ?? undefined,
      dateFrom: params.from ?? undefined,
      dateTo: params.to ?? undefined,
      sort: 'oldest',
    }
  }

  async #buildMaintenanceHistory(user: User, params: MaintenanceHistoryExportParams, i18n: I18n) {
    const { events } = await this.maintenanceService.getHistoryEventsForPdf(
      user,
      this.#historyQuery(params)
    )
    const headers = [
      'date',
      'boat',
      'title',
      'subject',
      'notes',
      'engineCaption',
      'sailCaption',
      'parts',
      'cost',
    ].map((column) => i18n.t(`csv.maintenanceHistory.${column}`))

    const rows = events.map((event) => [
      event.performedAt,
      event.boatName,
      event.title,
      event.subject,
      event.notes ?? '',
      event.engineCaption ?? '',
      event.sailCaption ?? '',
      event.parts.map((p) => `${p.quantity ?? 1} × ${p.name}`).join(', '),
      event.totalCost === null ? '' : event.totalCost.toFixed(2),
    ])
    return csvFile('maintenance-history', params, headers, rows)
  }

  // ---------------------------------------------------------------------------
  // Aiguillage
  // ---------------------------------------------------------------------------

  async count(
    type: FleetExportType,
    { org, user }: FleetExportContext,
    params: FleetExportParams
  ): Promise<number> {
    switch (type) {
      case 'invoices':
        return countOf(this.#invoicesQuery(org.id, params as InvoiceExportParams))
      case 'invoice_lines':
        return countOf(this.#invoiceLinesQuery(org.id, params as InvoiceExportParams))
      case 'fec':
        // Une pièce donne deux à cinq lignes : le seuil porte sur les pièces.
        return this.fecService.countDocuments(org.id, (params as FecExportParams).year)
      case 'reservations':
        return countOf(this.#reservationsQuery(org.id, params as ReservationExportParams))
      case 'clients':
        return countOf(this.#clientsQuery(org.id, params as ClientExportParams))
      case 'maintenance_history':
        return this.maintenanceService.countHistoryEvents(
          user,
          this.#historyQuery(params as MaintenanceHistoryExportParams)
        )
    }
  }

  async build(
    type: FleetExportType,
    { org, user }: FleetExportContext,
    params: FleetExportParams,
    i18n: I18n
  ): Promise<ExportFile> {
    switch (type) {
      case 'invoices':
        return this.#buildInvoices(org, params as InvoiceExportParams, i18n)
      case 'invoice_lines':
        return this.#buildInvoiceLines(org, params as InvoiceExportParams, i18n)
      case 'fec':
        return this.fecService.generate(org, (params as FecExportParams).year, i18n)
      case 'reservations':
        return this.#buildReservations(org, params as ReservationExportParams, i18n)
      case 'clients':
        return this.#buildClients(org, params as ClientExportParams, i18n)
      case 'maintenance_history':
        return this.#buildMaintenanceHistory(user, params as MaintenanceHistoryExportParams, i18n)
    }
  }
}
