import { UserNotInOrganizationError } from '#exceptions/organization_errors'
import type Organization from '#models/organization'
import type User from '#models/user'
import BoatPolicy from '#policies/boat_policy'
import ClientPolicy from '#policies/client_policy'
import InvoicePolicy from '#policies/invoice_policy'
import MaintenancePolicy from '#policies/maintenance_policy'
import AuditLogService from '#services/audit_log_service'
import ClientService from '#services/client_service'
import DataExportService from '#services/data_export_service'
import FleetExportService from '#services/fleet_export_service'
import InvoiceService from '#services/invoice_service'
import QuotaService from '#services/quota_service'
import { BILLING_SETTINGS_PATH } from '#shared/constants/billing'
import { EXPORT_ASYNC_THRESHOLD } from '#shared/constants/exports'
import { contentDisposition } from '#shared/helpers/content_disposition'
import type {
  ExportPeriod,
  FleetExportParams,
  FleetExportType,
  MaintenanceHistoryExportParams,
} from '#shared/types/export'
import { boatOwnerPortalRedirect } from '#utils/staff_route_guard'
import {
  clientExportValidator,
  fecExportValidator,
  invoiceExportValidator,
  reservationExportValidator,
} from '#validators/export'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { DateTime } from 'luxon'

function isoDay(value: DateTime | undefined): string | null {
  return value?.toISODate() ?? null
}

function toPeriod(payload: { from?: DateTime; to?: DateTime }): ExportPeriod {
  return { from: isoDay(payload.from), to: isoDay(payload.to) }
}

/**
 * Exports flotte et comptables (#879) : journal des ventes, FEC,
 * réservations, clients, historique de maintenance.
 *
 * Même garde partout : plan avec `canExport`, puis la capability de l'écran
 * que l'export reflète. Au-delà de `EXPORT_ASYNC_THRESHOLD` lignes, le
 * fichier part en arrière-plan (`GenerateExport`) et la réponse est une
 * redirection avec un message ; en dessous, il est servi tout de suite. Les
 * deux chemins écrivent `export.run` au journal d'audit.
 */
@inject()
export default class FleetExportsController {
  constructor(
    private fleetExportService: FleetExportService,
    private dataExportService: DataExportService,
    private quotaService: QuotaService,
    private invoiceService: InvoiceService,
    private clientService: ClientService,
    private auditLogService: AuditLogService
  ) {}

  async #loadUser(auth: HttpContext['auth']): Promise<{ user: User; org: Organization }> {
    const user = await auth.authenticate()
    await user.load('organization')
    if (user.organization === null) throw new UserNotInOrganizationError()
    this.quotaService.assertCanExport(user.organization)
    return { user, org: user.organization }
  }

  /**
   * Répond par le fichier, ou le confie au job et revient sur l'écran. Rend
   * le nombre de lignes, ou `null` si l'export est parti en arrière-plan.
   */
  async #respond(
    { response, session, i18n }: Pick<HttpContext, 'response' | 'session' | 'i18n'>,
    options: {
      org: Organization
      user: User
      type: FleetExportType
      params: FleetExportParams
      period: ExportPeriod | null
    }
  ) {
    const context = { org: options.org, user: options.user }
    const count = await this.fleetExportService.count(options.type, context, options.params)

    if (count > EXPORT_ASYNC_THRESHOLD) {
      await this.dataExportService.queue({ ...context, type: options.type, params: options.params })
      session.flash('success', i18n.t('flash.exports.queued'))
      response.redirect().back()
      return null
    }

    const file = await this.fleetExportService.build(options.type, context, options.params, i18n)
    await this.dataExportService.logRun({
      organizationId: options.org.id,
      userId: options.user.id,
      type: options.type,
      params: { ...options.params },
      period: options.period,
      rowCount: file.rowCount,
      async: false,
    })

    response.header('Content-Type', file.contentType)
    response.header('Content-Disposition', contentDisposition(file.filename))
    response.header('Content-Length', String(file.buffer.length))
    response.send(file.buffer)
    return file.rowCount
  }

  /**
   * Lecture des factures : module actif, ou pièces déjà émises — l'export
   * reste permis en lecture seule après résiliation (#332).
   */
  async #canReadInvoices(org: Organization): Promise<boolean> {
    return (
      (await this.quotaService.canManageInvoices(org)) ||
      (await this.invoiceService.hasAnyForOrg(org.id))
    )
  }

  /** `GET /invoices/export.csv` — journal des ventes, par pièce ou par ligne. */
  async invoices({ auth, bouncer, request, response, session, i18n }: HttpContext) {
    const { user, org } = await this.#loadUser(auth)
    if (!(await this.#canReadInvoices(org))) {
      session.flash('error', i18n.t('flash.quota.invoicesExceeded'))
      return response.redirect(BILLING_SETTINGS_PATH)
    }
    await bouncer.with(InvoicePolicy).authorize('view')

    const payload = await request.validateUsing(invoiceExportValidator)
    const period = toPeriod(payload)
    const detail = payload.detail ?? 'documents'
    await this.#respond(
      { response, session, i18n },
      {
        org,
        user,
        type: detail === 'lines' ? 'invoice_lines' : 'invoices',
        params: {
          ...period,
          kind: payload.kind ?? null,
          status: payload.status ?? null,
          detail,
        },
        period,
      }
    )
  }

  /** `GET /invoices/export/fec?year=` — fichier des écritures comptables. */
  async fec({ auth, bouncer, request, response, session, i18n }: HttpContext) {
    const { user, org } = await this.#loadUser(auth)
    if (!(await this.#canReadInvoices(org))) {
      session.flash('error', i18n.t('flash.quota.invoicesExceeded'))
      return response.redirect(BILLING_SETTINGS_PATH)
    }
    await bouncer.with(InvoicePolicy).authorize('view')

    const { year } = await request.validateUsing(fecExportValidator)
    await this.#respond(
      { response, session, i18n },
      {
        org,
        user,
        type: 'fec',
        params: { year },
        period: { from: `${year}-01-01`, to: `${year}-12-31` },
      }
    )
  }

  /** `GET /reservations/export.csv` — réservations qui chevauchent la période. */
  async reservations({ auth, bouncer, request, response, session, i18n }: HttpContext) {
    const { user, org } = await this.#loadUser(auth)
    const portalRedirect = await boatOwnerPortalRedirect(user)
    if (portalRedirect) return response.redirect(portalRedirect)
    await bouncer.with(BoatPolicy).authorize('view')

    const payload = await request.validateUsing(reservationExportValidator)
    const period = toPeriod(payload)
    await this.#respond(
      { response, session, i18n },
      {
        org,
        user,
        type: 'reservations',
        params: {
          ...period,
          boatId: payload.boatId ?? null,
          status: payload.status ?? null,
          paymentStatus: payload.paymentStatus ?? null,
        },
        period,
      }
    )
  }

  /**
   * `GET /clients/export.csv` — fiches clients, hors anonymisées. Même seuil
   * que l'export RGPD d'une fiche (`update`) : c'est de la donnée personnelle
   * en masse, journalisée à part (`client.export_bulk`).
   */
  async clients({ auth, bouncer, request, response, session, i18n }: HttpContext) {
    const { user, org } = await this.#loadUser(auth)
    const canRead =
      (await this.quotaService.canManageClients(org)) ||
      (await this.clientService.hasAnyForOrg(org.id))
    if (!canRead) {
      session.flash('error', i18n.t('flash.quota.clientsExceeded'))
      return response.redirect(BILLING_SETTINGS_PATH)
    }
    await bouncer.with(ClientPolicy).authorize('update')

    const payload = await request.validateUsing(clientExportValidator)
    const period = toPeriod(payload)
    const rowCount = await this.#respond(
      { response, session, i18n },
      { org, user, type: 'clients', params: period, period }
    )
    if (rowCount !== null) {
      await this.auditLogService.log({
        organizationId: org.id,
        userId: user.id,
        action: 'client.export_bulk',
        entityType: 'client',
        metadata: { from: period.from, to: period.to, rowCount },
      })
    }
  }

  /**
   * `GET /maintenance/history.csv` — historique de la flotte, avec les
   * filtres de l'écran (bateau, sujet, recherche, période).
   */
  async maintenanceHistory({ auth, bouncer, request, response, session, i18n }: HttpContext) {
    const { user, org } = await this.#loadUser(auth)
    const portalRedirect = await boatOwnerPortalRedirect(user)
    if (portalRedirect) return response.redirect(portalRedirect)
    await bouncer.with(MaintenancePolicy).authorize('view')

    // Les filtres de l'écran sont normalisés par le service (valeur inconnue
    // ignorée), comme pour le PDF de la même page.
    const qs = request.qs()
    const { dateFrom, dateTo, q, subject, boatId } =
      this.fleetExportService.normalizeHistoryFilters(qs)
    const period = { from: dateFrom, to: dateTo }
    const params: MaintenanceHistoryExportParams = { ...period, q, subject, boatId }
    await this.#respond(
      { response, session, i18n },
      { org, user, type: 'maintenance_history', params, period }
    )
  }
}
