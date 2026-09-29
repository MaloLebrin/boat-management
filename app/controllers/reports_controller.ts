import OrganizationPolicy from '#policies/organization_policy'
import BoatListService from '#services/boat_list_service'
import { buildCsv } from '#services/csv_export_service'
import FleetReportingService from '#services/fleet_reporting_service'
import QuotaService from '#services/quota_service'
import { contentDisposition } from '#shared/helpers/content_disposition'
import {
  REPORT_COST_CATEGORIES,
  type FleetReportQuery,
  type ReportMetrics,
  type ReportsPageProps,
} from '#shared/types/reporting'
import { boatOwnerPortalRedirect } from '#utils/staff_route_guard'
import { reportQueryValidator } from '#validators/report'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Reporting financier de flotte (#887). Admin (`reports.view`) sur un plan
 * Pro ou Entreprise (`canViewReports`) ; un admin Starter voit la page, figée
 * et sans données, avec l'invitation à passer au plan supérieur.
 */
@inject()
export default class ReportsController {
  constructor(
    private reportingService: FleetReportingService,
    private boatListService: BoatListService,
    private quotaService: QuotaService
  ) {}

  async index({ inertia, auth, bouncer, request, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const portalRedirect = await boatOwnerPortalRedirect(user)
    if (portalRedirect) return response.redirect(portalRedirect)

    await bouncer.with(OrganizationPolicy).authorize('viewReports')
    await user.load('organization')
    const org = user.organization

    const query = await this.#query(request)
    const boats = await this.boatListService.listNamesForOrg(user)
    const locked = !this.quotaService.canViewReports(org)

    const [charterEnabled, invoicingEnabled] = await Promise.all([
      this.quotaService.canManageReservations(org),
      this.quotaService.canManageInvoices(org),
    ])

    const props: ReportsPageProps = {
      locked,
      report: locked ? null : await this.reportingService.getReport(org.id, boats, query),
      boats,
      query,
      charterEnabled,
      invoicingEnabled,
      canExport: !locked && this.quotaService.canExport(org),
    }
    return inertia.render('reports/index', { ...props })
  }

  /** `GET /reports/export.csv` — une ligne par bateau, puis le total de la flotte. */
  async export({ auth, bouncer, request, response, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    await bouncer.with(OrganizationPolicy).authorize('viewReports')
    await user.load('organization')
    const org = user.organization
    this.quotaService.assertCanExport(org)
    if (!this.quotaService.canViewReports(org)) return response.forbidden()

    const query = await this.#query(request)
    const boats = await this.boatListService.listNamesForOrg(user)
    const report = await this.reportingService.getReport(org.id, boats, query)

    const columns = [
      ...REPORT_COST_CATEGORIES,
      'costTotal',
      'rentalRevenue',
      'invoicedPaid',
      'margin',
      'rentalDays',
      'occupancyRate',
      'engineHours',
      'distanceNm',
      'costPerEngineHour',
      'costPerRentalDay',
      'costPerNauticalMile',
    ] as const
    const headers = ['boat', ...columns].map((column) => i18n.t(`reports.csv.${column}`))
    const cells = (metrics: ReportMetrics) =>
      columns.map((column) => {
        switch (column) {
          case 'costTotal':
            return metrics.costs.total
          case 'rentalRevenue':
          case 'invoicedPaid':
          case 'margin':
          case 'rentalDays':
          case 'occupancyRate':
          case 'engineHours':
          case 'distanceNm':
          case 'costPerEngineHour':
          case 'costPerRentalDay':
          case 'costPerNauticalMile':
            return metrics[column]
          default:
            return metrics.costs[column]
        }
      })

    const rows = report.boats.map((row) => [row.boatName, ...cells(row)])
    rows.push([i18n.t('reports.csv.fleetTotal'), ...cells(report.totals)])

    const buffer = buildCsv(headers, rows)
    const filename = `rapport_flotte_${report.period.from}_${report.period.to}.csv`
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.header('Content-Disposition', contentDisposition(filename))
    response.header('Content-Length', String(buffer.length))
    return response.send(buffer)
  }

  async #query(request: HttpContext['request']): Promise<FleetReportQuery> {
    const input = await request.validateUsing(reportQueryValidator)
    return {
      preset: input.period ?? 'month',
      from: input.from ?? null,
      to: input.to ?? null,
      boatId: input.boat ?? null,
    }
  }
}
