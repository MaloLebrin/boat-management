import BoatPolicy from '#policies/boat_policy'
import MaintenancePolicy from '#policies/maintenance_policy'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import BoatFuelLogService from '#services/boat_fuel_log_service'
import NavigationLogService from '#services/navigation_log_service'
import BudgetService from '#services/budget_service'
import QuotaService from '#services/quota_service'
import { buildCsv, csvFilename, isInPeriod } from '#services/csv_export_service'
import { budgetYearValidator } from '#validators/budget_validator'
import { exportPeriodValidator } from '#validators/export'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import BoatContextService from '#services/boat_context_service'
import type Boat from '#models/boat'
import type User from '#models/user'
import { contentDisposition } from '#shared/helpers/content_disposition'

/**
 * En-têtes d'un export dans la langue de l'utilisateur (#863) — namespace
 * backend-only `csv`. Les colonnes restaient en français (`légende_moteur`,
 * `coût_total`) quelle que soit la locale.
 */
/**
 * Période `from`/`to` (bornes incluses) des exports par bateau (#879) —
 * absente, l'export couvre tout l'historique comme avant.
 */
async function exportPeriod(request: HttpContext['request']) {
  const { from, to } = await request.validateUsing(exportPeriodValidator)
  return {
    from: from?.toISODate() ?? null,
    to: to?.toISODate() ?? null,
  }
}

function csvHeaders(i18n: HttpContext['i18n'], exportName: string, columns: string[]): string[] {
  return columns.map((column) => i18n.t(`csv.${exportName}.${column}`))
}

@inject()
export default class CsvExportController {
  constructor(
    private boatContext: BoatContextService,
    private maintenanceService: BoatMaintenanceService,
    private taskService: BoatMaintenanceTaskService,
    private fuelLogService: BoatFuelLogService,
    private navigationLogService: NavigationLogService,
    private budgetService: BudgetService,
    private quotaService: QuotaService
  ) {}

  /**
   * Préambule commun aux exports par bateau : quota, bateau de l'organisation,
   * puis la policy propre à la donnée exportée. `authorize` est obligatoire —
   * trois exports sur quatre s'arrêtaient au scope organisation, et un
   * boat_owner exportait les données de n'importe quel bateau (#845).
   */
  private async resolveExportBoat(
    { auth, response, params }: Pick<HttpContext, 'auth' | 'response' | 'params'>,
    authorize: (boat: Boat) => Promise<void>
  ): Promise<{ user: User; boat: Boat } | null> {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await user.load('organization')

    this.quotaService.assertCanExport(user.organization)

    const resolved = await this.boatContext.resolveBoat({ auth, response, params }, 'id')
    if (!resolved) return null

    await authorize(resolved.boat)
    return { user, boat: resolved.boat }
  }

  /**
   * Tâches planifiées du bateau avec leur ordre de travail (#868) : qui, quel
   * prestataire, combien prévu et combien réalisé. Même garde que l'export de
   * l'historique.
   */
  async maintenanceTasks({ response, auth, bouncer, params, request, i18n }: HttpContext) {
    const resolved = await this.resolveExportBoat({ auth, response, params }, (boat) =>
      bouncer.with(MaintenancePolicy).authorize('view', boat)
    )
    if (!resolved) return
    const { user, boat } = resolved

    // Une tâche tombe dans la période par sa date de réalisation, à défaut
    // par son échéance ; sans date, elle n'en fait partie que sans période.
    const period = await exportPeriod(request)
    const allTasks = await this.taskService.listForBoat(user, boat)
    const tasks = allTasks.filter((task) => isInPeriod(task.doneAt ?? task.dueAt, period))

    const headers = csvHeaders(i18n, 'maintenanceTasks', [
      'title',
      'subject',
      'status',
      'dueAt',
      'dueEngineHours',
      'doneAt',
      'assignee',
      'provider',
      'estimatedCost',
      'actualCost',
      'estimatedDurationMinutes',
      'actualDurationMinutes',
    ])
    const amount = (value: string | null) =>
      value === null ? '' : Number.parseFloat(value).toFixed(2)
    const rows = tasks.map((task) => [
      task.title,
      task.subject,
      task.status,
      task.dueAt?.toISODate() ?? '',
      task.dueEngineHours === null ? '' : String(task.dueEngineHours),
      task.doneAt?.toISODate() ?? '',
      task.assigneeId !== null && task.assignee
        ? task.assignee.fullName || task.assignee.email
        : '',
      task.providerName ?? '',
      amount(task.estimatedCost),
      amount(task.actualCost),
      task.estimatedDurationMinutes === null ? '' : String(task.estimatedDurationMinutes),
      task.actualDurationMinutes === null ? '' : String(task.actualDurationMinutes),
    ])

    const buffer = buildCsv(headers, rows)
    const filename = csvFilename('maintenance-tasks', boat.name)
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.header('Content-Disposition', contentDisposition(filename))
    response.header('Content-Length', String(buffer.length))
    return response.send(buffer)
  }

  async maintenance({ response, auth, bouncer, params, request, i18n }: HttpContext) {
    const resolved = await this.resolveExportBoat({ auth, response, params }, (boat) =>
      bouncer.with(MaintenancePolicy).authorize('view', boat)
    )
    if (!resolved) return
    const { boat } = resolved

    const period = await exportPeriod(request)
    const allEvents = await this.maintenanceService.listForBoat(boat)
    const events = allEvents.filter((ev) => isInPeriod(ev.performedAt, period))

    const headers = csvHeaders(i18n, 'maintenance', [
      'date',
      'title',
      'subject',
      'notes',
      'engineCaption',
      'sailCaption',
      'cost',
    ])
    const rows = events.map((ev) => {
      const totalCost = ev.parts.reduce((sum, p) => {
        const price = p.unitPrice ? Number.parseFloat(p.unitPrice) : 0
        return sum + price * (p.quantity ?? 1)
      }, 0)
      return [
        ev.performedAt.toISODate(),
        ev.title,
        ev.subject,
        ev.notes ?? '',
        ev.engineCaption ?? '',
        ev.sailCaption ?? '',
        totalCost > 0 ? totalCost.toFixed(2) : '',
      ]
    })

    const buffer = buildCsv(headers, rows)
    const filename = csvFilename('maintenance', boat.name)
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.header('Content-Disposition', contentDisposition(filename))
    response.header('Content-Length', String(buffer.length))
    return response.send(buffer)
  }

  async fuelLogs({ response, auth, bouncer, params, request, i18n }: HttpContext) {
    const resolved = await this.resolveExportBoat({ auth, response, params }, (boat) =>
      bouncer.with(BoatPolicy).authorize('view', boat)
    )
    if (!resolved) return
    const { user, boat } = resolved

    const period = await exportPeriod(request)
    const allLogs = await this.fuelLogService.listForBoat(user, boat)
    const logs = allLogs.filter((l) => isInPeriod(l.fueledAt, period))

    const headers = csvHeaders(i18n, 'fuelLogs', [
      'date',
      'quantityLiters',
      'pricePerLiter',
      'totalCost',
      'engineHours',
      'fuelType',
      'supplier',
      'notes',
    ])
    const rows = logs.map((l) => [
      l.fueledAt.toISODate(),
      l.quantityLiters ?? '',
      l.pricePerLiter ?? '',
      l.totalCost ?? '',
      l.engineHoursAtFueling ?? '',
      // Vide pour les pleins antérieurs à #585 — la colonne existe quand même.
      l.fuelType ?? '',
      l.supplier ?? '',
      l.notes ?? '',
    ])

    const buffer = buildCsv(headers, rows)
    const filename = csvFilename('avitaillements', boat.name)
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.header('Content-Disposition', contentDisposition(filename))
    response.header('Content-Length', String(buffer.length))
    return response.send(buffer)
  }

  async navigationLogs({ response, auth, bouncer, params, request, i18n }: HttpContext) {
    const resolved = await this.resolveExportBoat({ auth, response, params }, (boat) =>
      bouncer.with(BoatPolicy).authorize('view', boat)
    )
    if (!resolved) return
    const { boat } = resolved

    const period = await exportPeriod(request)
    const allLogs = await this.navigationLogService.listForBoat(boat)
    const logs = allLogs.filter((l) => isInPeriod(l.departedAt, period))

    const headers = csvHeaders(i18n, 'navigationLogs', [
      'departedAt',
      'arrivedAt',
      'departurePort',
      'arrivalPort',
      'distanceNm',
      'engineHoursStart',
      'engineHoursEnd',
      'fuelConsumedLiters',
      'windBeaufort',
      'seaState',
      'crewCount',
      'status',
      'notes',
    ])
    const rows = logs.map((l) => [
      l.departedAt.toISO(),
      l.arrivedAt?.toISO() ?? '',
      l.departurePortName ?? '',
      l.arrivalPortName ?? '',
      l.distanceNm ?? '',
      l.engineHoursStart ?? '',
      l.engineHoursEnd ?? '',
      l.fuelConsumedLiters ?? '',
      l.windForceBeaufort ?? '',
      l.seaState ?? '',
      l.crewCount ?? '',
      l.status,
      l.notes ?? '',
    ])

    const buffer = buildCsv(headers, rows)
    const filename = csvFilename('journal_de_bord', boat.name)
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.header('Content-Disposition', contentDisposition(filename))
    response.header('Content-Length', String(buffer.length))
    return response.send(buffer)
  }

  async budget({ response, auth, bouncer, params, request, i18n }: HttpContext) {
    const resolved = await this.resolveExportBoat({ auth, response, params }, (boat) =>
      bouncer.with(BoatPolicy).authorize('view', boat)
    )
    if (!resolved) return
    const { boat } = resolved

    const { year: rawYear } = await request.validateUsing(budgetYearValidator)
    const year = rawYear ?? new Date().getFullYear()
    const budget = await this.budgetService.getForBoat(boat, year)

    const headers = [
      i18n.t('budget.csv.headers.month'),
      i18n.t('budget.csv.headers.maintenance'),
      i18n.t('budget.csv.headers.fuel'),
      i18n.t('budget.csv.headers.documents'),
      i18n.t('budget.csv.headers.port'),
      i18n.t('budget.csv.headers.equipment'),
      i18n.t('budget.csv.headers.entries'),
      i18n.t('budget.csv.headers.total'),
    ]
    const rows = budget.monthly.map((m) => [
      i18n.t(`budget.csv.monthNames.${String(m.month)}`),
      m.maintenance.toFixed(2),
      m.fuel.toFixed(2),
      m.documents.toFixed(2),
      m.port.toFixed(2),
      m.equipment.toFixed(2),
      m.entries.toFixed(2),
      m.total.toFixed(2),
    ])
    rows.push([
      i18n.t('budget.csv.headers.totalRow'),
      budget.totals.maintenance.toFixed(2),
      budget.totals.fuel.toFixed(2),
      budget.totals.documents.toFixed(2),
      budget.totals.port.toFixed(2),
      budget.totals.equipment.toFixed(2),
      budget.totals.entries.toFixed(2),
      budget.totals.total.toFixed(2),
    ])

    const buffer = buildCsv(headers, rows)
    const filename = csvFilename(`budget_${year}`, boat.name)
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.header('Content-Disposition', contentDisposition(filename))
    response.header('Content-Length', String(buffer.length))
    return response.send(buffer)
  }
}
