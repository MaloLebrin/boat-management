import BoatService, { BoatNotFoundError } from '#services/boat_service'
import BoatPolicy from '#policies/boat_policy'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import BoatFuelLogService from '#services/boat_fuel_log_service'
import NavigationLogService from '#services/navigation_log_service'
import BudgetService from '#services/budget_service'
import QuotaService from '#services/quota_service'
import { QuotaExceededError } from '#exceptions/quota_errors'
import { buildCsv, csvFilename } from '#services/csv_export_service'
import { budgetYearValidator } from '#validators/budget_validator'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class CsvExportController {
  constructor(
    private boatService: BoatService,
    private maintenanceService: BoatMaintenanceService,
    private fuelLogService: BoatFuelLogService,
    private navigationLogService: NavigationLogService,
    private budgetService: BudgetService,
    private quotaService: QuotaService
  ) {}

  async maintenance({ response, auth, params, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await user.load('organization')

    try {
      this.quotaService.assertCanExport(user.organization)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t('flash.quota.exportExceeded'))
        return response.redirect().back()
      }
      throw error
    }

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.id))
    } catch (error) {
      if (error instanceof BoatNotFoundError) return response.redirect('/boats')
      throw error
    }

    const events = await this.maintenanceService.listForBoat(user, boat)

    const headers = [
      'date',
      'titre',
      'sujet',
      'notes',
      'légende_moteur',
      'légende_voile',
      'coût_total',
    ]
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
    response.header('Content-Disposition', `attachment; filename="${filename}"`)
    response.header('Content-Length', String(buffer.length))
    return response.send(buffer)
  }

  async fuelLogs({ response, auth, params, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await user.load('organization')

    try {
      this.quotaService.assertCanExport(user.organization)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t('flash.quota.exportExceeded'))
        return response.redirect().back()
      }
      throw error
    }

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.id))
    } catch (error) {
      if (error instanceof BoatNotFoundError) return response.redirect('/boats')
      throw error
    }

    const logs = await this.fuelLogService.listForBoat(user, boat)

    const headers = [
      'date',
      'quantité_litres',
      'prix_par_litre',
      'coût_total',
      'heures_moteur',
      'fournisseur',
      'notes',
    ]
    const rows = logs.map((l) => [
      l.fueledAt.toISODate(),
      l.quantityLiters ?? '',
      l.pricePerLiter ?? '',
      l.totalCost ?? '',
      l.engineHoursAtFueling ?? '',
      l.supplier ?? '',
      l.notes ?? '',
    ])

    const buffer = buildCsv(headers, rows)
    const filename = csvFilename('avitaillements', boat.name)
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.header('Content-Disposition', `attachment; filename="${filename}"`)
    response.header('Content-Length', String(buffer.length))
    return response.send(buffer)
  }

  async navigationLogs({ response, auth, params, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await user.load('organization')

    try {
      this.quotaService.assertCanExport(user.organization)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t('flash.quota.exportExceeded'))
        return response.redirect().back()
      }
      throw error
    }

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.id))
    } catch (error) {
      if (error instanceof BoatNotFoundError) return response.redirect('/boats')
      throw error
    }

    const logs = await this.navigationLogService.listForBoat(boat)

    const headers = [
      'date_départ',
      'date_arrivée',
      'port_départ',
      'port_arrivée',
      'distance_nm',
      'heures_moteur_départ',
      'heures_moteur_arrivée',
      'carburant_consommé_L',
      'vent_beaufort',
      'état_mer',
      'nb_équipiers',
      'statut',
      'notes',
    ]
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
    response.header('Content-Disposition', `attachment; filename="${filename}"`)
    response.header('Content-Length', String(buffer.length))
    return response.send(buffer)
  }

  async budget({ response, auth, bouncer, params, request, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await user.load('organization')

    try {
      this.quotaService.assertCanExport(user.organization)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t('flash.quota.exportExceeded'))
        return response.redirect().back()
      }
      throw error
    }

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.id))
    } catch (error) {
      if (error instanceof BoatNotFoundError) return response.redirect('/boats')
      throw error
    }

    await bouncer.with(BoatPolicy).authorize('view', boat)

    const { year: rawYear } = await request.validateUsing(budgetYearValidator)
    const year = rawYear ?? new Date().getFullYear()
    const budget = await this.budgetService.getForBoat(boat, year)

    const headers = [
      i18n.t('budget.csv.headers.month'),
      i18n.t('budget.csv.headers.maintenance'),
      i18n.t('budget.csv.headers.fuel'),
      i18n.t('budget.csv.headers.documents'),
      i18n.t('budget.csv.headers.port'),
      i18n.t('budget.csv.headers.total'),
    ]
    const rows = budget.monthly.map((m) => [
      i18n.t(`budget.csv.monthNames.${String(m.month)}`),
      m.maintenance.toFixed(2),
      m.fuel.toFixed(2),
      m.documents.toFixed(2),
      m.port.toFixed(2),
      m.total.toFixed(2),
    ])
    rows.push([
      i18n.t('budget.csv.headers.totalRow'),
      budget.totals.maintenance.toFixed(2),
      budget.totals.fuel.toFixed(2),
      budget.totals.documents.toFixed(2),
      budget.totals.port.toFixed(2),
      budget.totals.total.toFixed(2),
    ])

    const buffer = buildCsv(headers, rows)
    const filename = csvFilename(`budget_${year}`, boat.name)
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.header('Content-Disposition', `attachment; filename="${filename}"`)
    response.header('Content-Length', String(buffer.length))
    return response.send(buffer)
  }
}
