import type User from '#models/user'
import BoatListService from '#services/boat_list_service'
import BudgetService from '#services/budget_service'
import {
  addCost,
  emptyCostBreakdown,
  emptyRawMetrics,
  finalizeMetrics,
  periodEndExclusive,
  previousReportPeriod,
  reportMonths,
  resolveReportPeriod,
  roundMoney,
  splitRental,
  type RawMetrics,
} from '#shared/helpers/reporting'
import type {
  DashboardFleetMargin,
  FleetReport,
  FleetReportBoatRow,
  FleetReportMonth,
  FleetReportQuery,
  ReportBoatOption,
  ReportCostBreakdown,
  ReportCostCategory,
  ReportPeriod,
} from '#shared/types/reporting'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

interface CostRow {
  boat_id: number
  month: string
  total: string | null
}

interface Aggregate {
  total: RawMetrics
  perBoat: Map<number, RawMetrics>
  monthlyCosts: Map<string, ReportCostBreakdown>
  monthlyRevenue: Map<string, number>
  monthlyRentalDays: Map<string, number>
}

function toNumber(value: unknown): number {
  const parsed = Number.parseFloat(String(value ?? '0'))
  return Number.isFinite(parsed) ? parsed : 0
}

function toDateTime(value: unknown): DateTime {
  return value instanceof Date
    ? DateTime.fromJSDate(value, { zone: 'utc' })
    : DateTime.fromISO(String(value), { zone: 'utc' })
}

/**
 * Vue financière de flotte (#887) : coûts par poste, revenus de location,
 * marge, occupation et coûts unitaires, par bateau et par mois.
 *
 * Tout est agrégé en SQL (`SUM … GROUP BY boat_id, mois`) ; seules les
 * réservations confirmées remontent ligne à ligne, parce que leur prix se
 * répartit au prorata des jours sur les mois qu'elles chevauchent. Le
 * périmètre (`boats`) est résolu par l'appelant parmi les bateaux de
 * l'organisation — le service ne lit jamais un `boat_id` qu'on ne lui a pas
 * donné, et ne lit les factures que de l'organisation passée.
 */
@inject()
export default class FleetReportingService {
  constructor(
    private budgetService: BudgetService,
    private boatListService: BoatListService
  ) {}

  async getReport(
    organizationId: number,
    boats: ReportBoatOption[],
    query: FleetReportQuery,
    now: DateTime = DateTime.now()
  ): Promise<FleetReport> {
    const period = resolveReportPeriod(query.preset, now.toISODate()!, query)
    const previousPeriod = previousReportPeriod(period)
    // Un bateau hors de l'organisation (ou inconnu) ne filtre rien : on
    // retombe sur la flotte plutôt que sur un rapport vide trompeur.
    const selected = boats.find((b) => b.id === query.boatId) ?? null
    const scoped = selected ? [selected] : boats
    const boatIds = scoped.map((b) => b.id)
    // Une facture sans réservation n'appartient à aucun bateau : elle compte
    // dans l'encaissé de la flotte, jamais dans celui d'un bateau filtré.
    const includeUnattributed = selected === null

    const [current, previous, plannedMaintenance] = await Promise.all([
      this.#aggregate(organizationId, boatIds, period, includeUnattributed),
      this.#aggregate(organizationId, boatIds, previousPeriod, includeUnattributed),
      this.budgetService.getPlannedMaintenance(boatIds, now),
    ])

    const boatRows: FleetReportBoatRow[] = scoped
      .map((boat) => ({
        boatId: boat.id,
        boatName: boat.name,
        ...finalizeMetrics(current.perBoat.get(boat.id) ?? emptyRawMetrics(), 1, period.days),
      }))
      .sort((a, b) => b.costs.total - a.costs.total || a.boatName.localeCompare(b.boatName))

    return {
      period,
      previousPeriod,
      boatId: selected?.id ?? null,
      totals: finalizeMetrics(current.total, scoped.length, period.days),
      previousTotals: finalizeMetrics(previous.total, scoped.length, previousPeriod.days),
      boats: boatRows,
      monthly: this.#monthly(current, period, scoped.length),
      plannedMaintenance,
    }
  }

  /**
   * Widget « Marge du mois » (#887) : le rapport du mois sur toute la flotte
   * de l'utilisateur, réduit à l'essentiel.
   */
  async getMonthMarginForUser(
    user: User,
    now: DateTime = DateTime.now()
  ): Promise<DashboardFleetMargin> {
    const boats = await this.boatListService.listNamesForOrg(user)
    const report = await this.getReport(user.organizationId ?? 0, boats, { preset: 'month' }, now)
    const top = report.boats[0]
    return {
      period: report.period,
      rentalRevenue: report.totals.rentalRevenue,
      costs: report.totals.costs.total,
      margin: report.totals.margin,
      previousMargin: report.previousTotals.margin,
      topCostBoat:
        top && top.costs.total > 0
          ? { id: top.boatId, name: top.boatName, costs: top.costs.total }
          : null,
    }
  }

  #monthly(aggregate: Aggregate, period: ReportPeriod, boatCount: number): FleetReportMonth[] {
    const from = DateTime.fromISO(period.from, { zone: 'utc' })
    const to = DateTime.fromISO(period.to, { zone: 'utc' })
    return reportMonths(period).map((month) => {
      const monthStart = DateTime.fromFormat(month, 'yyyy-MM', { zone: 'utc' })
      const first = monthStart < from ? from : monthStart
      const monthLast = monthStart.endOf('month').startOf('day')
      const last = monthLast > to ? to : monthLast
      const days = Math.round(last.diff(first, 'days').days) + 1
      const rentalDays = aggregate.monthlyRentalDays.get(month) ?? 0
      const capacity = boatCount * days
      return {
        month,
        costs: aggregate.monthlyCosts.get(month) ?? emptyCostBreakdown(),
        rentalRevenue: roundMoney(aggregate.monthlyRevenue.get(month) ?? 0),
        occupancyRate: capacity > 0 ? Math.min(100, Math.round((100 * rentalDays) / capacity)) : 0,
      }
    })
  }

  async #aggregate(
    organizationId: number,
    boatIds: number[],
    period: ReportPeriod,
    includeUnattributed: boolean
  ): Promise<Aggregate> {
    const aggregate: Aggregate = {
      total: emptyRawMetrics(),
      perBoat: new Map(),
      monthlyCosts: new Map(),
      monthlyRevenue: new Map(),
      monthlyRentalDays: new Map(),
    }
    if (boatIds.length === 0) return aggregate

    const from = period.from
    const until = periodEndExclusive(period).toISODate()!
    const boatMetrics = (boatId: number) => {
      let metrics = aggregate.perBoat.get(boatId)
      if (!metrics) {
        metrics = emptyRawMetrics()
        aggregate.perBoat.set(boatId, metrics)
      }
      return metrics
    }

    const [costs, reservations, invoices, navigation] = await Promise.all([
      this.#costRows(boatIds, from, until),
      this.#confirmedReservations(organizationId, boatIds, from, until),
      this.#invoiceRows(organizationId, boatIds, from, until, includeUnattributed),
      this.#navigationRows(boatIds, from, until),
    ])

    for (const [category, rows] of costs) {
      for (const row of rows) {
        const amount = toNumber(row.total)
        if (amount === 0) continue
        addCost(aggregate.total.costs, category, amount)
        addCost(boatMetrics(Number(row.boat_id)).costs, category, amount)
        let monthly = aggregate.monthlyCosts.get(row.month)
        if (!monthly) {
          monthly = emptyCostBreakdown()
          aggregate.monthlyCosts.set(row.month, monthly)
        }
        addCost(monthly, category, amount)
      }
    }

    for (const reservation of reservations) {
      const price = reservation.total_price === null ? null : toNumber(reservation.total_price)
      const slices = splitRental(
        toDateTime(reservation.starts_at),
        toDateTime(reservation.ends_at),
        price,
        period
      )
      const metrics = boatMetrics(Number(reservation.boat_id))
      for (const slice of slices) {
        metrics.rentalDays += slice.days
        metrics.rentalRevenue += slice.revenue
        aggregate.total.rentalDays += slice.days
        aggregate.total.rentalRevenue += slice.revenue
        aggregate.monthlyRentalDays.set(
          slice.month,
          (aggregate.monthlyRentalDays.get(slice.month) ?? 0) + slice.days
        )
        aggregate.monthlyRevenue.set(
          slice.month,
          (aggregate.monthlyRevenue.get(slice.month) ?? 0) + slice.revenue
        )
      }
    }

    for (const row of invoices) {
      const amount = toNumber(row.total)
      aggregate.total.invoicedPaid += amount
      if (row.boat_id !== null) boatMetrics(Number(row.boat_id)).invoicedPaid += amount
    }

    for (const row of navigation) {
      const hours = toNumber(row.engine_hours)
      const distance = toNumber(row.distance_nm)
      const metrics = boatMetrics(Number(row.boat_id))
      metrics.engineHours += hours
      metrics.distanceNm += distance
      aggregate.total.engineHours += hours
      aggregate.total.distanceNm += distance
    }

    return aggregate
  }

  /** Mêmes sources que `BudgetService`, bornées à `[from, until)` et groupées par bateau et mois. */
  async #costRows(
    boatIds: number[],
    from: string,
    until: string
  ): Promise<[ReportCostCategory, CostRow[]][]> {
    const byBoatMonth = (table: string, dateExpr: string, sumExpr: string, boatColumn: string) =>
      db
        .from(table)
        .whereIn(boatColumn, boatIds)
        .whereRaw(`${dateExpr} >= ?`, [from])
        .whereRaw(`${dateExpr} < ?`, [until])
        .select(db.raw(`${boatColumn} as boat_id`))
        .select(db.raw(`to_char(${dateExpr}, 'YYYY-MM') as month`))
        .select(db.raw(`sum(${sumExpr}) as total`))
        .groupByRaw(`${boatColumn}, to_char(${dateExpr}, 'YYYY-MM')`)

    const purchases = (table: string) =>
      byBoatMonth(table, 'purchased_at', 'purchase_price', 'boat_id').whereNotNull('purchase_price')

    const [maintenance, fuel, documents, port, generic, safety, sails, engineParts, entries] =
      await Promise.all([
        byBoatMonth(
          'boat_maintenance_events as me',
          'me.performed_at',
          'p.unit_price * coalesce(p.quantity, 1)',
          'me.boat_id'
        )
          .join('boat_maintenance_parts as p', 'p.maintenance_event_id', 'me.id')
          .whereNotNull('p.unit_price'),
        byBoatMonth('boat_fuel_logs', 'fueled_at', 'total_cost', 'boat_id').whereNotNull(
          'total_cost'
        ),
        byBoatMonth(
          'boat_documents',
          'coalesce(issued_at, created_at)',
          'cost',
          'boat_id'
        ).whereNotNull('cost'),
        byBoatMonth('boat_port_stays', 'started_at', 'cost', 'boat_id').whereNotNull('cost'),
        purchases('boat_generic_equipment'),
        purchases('boat_safety_equipment'),
        purchases('boat_sails'),
        byBoatMonth(
          'boat_engine_parts as bep',
          'bep.purchased_at',
          'bep.purchase_price',
          'be.boat_id'
        )
          .join('boat_engines as be', 'be.id', 'bep.boat_engine_id')
          .whereNotNull('bep.purchase_price'),
        byBoatMonth('boat_budget_entries', 'date', 'amount', 'boat_id'),
      ])

    return [
      ['maintenance', maintenance],
      ['fuel', fuel],
      ['documents', documents],
      ['port', port],
      ['equipment', [...generic, ...safety, ...sails, ...engineParts]],
      ['entries', entries],
    ]
  }

  async #confirmedReservations(
    organizationId: number,
    boatIds: number[],
    from: string,
    until: string
  ): Promise<{ boat_id: number; starts_at: unknown; ends_at: unknown; total_price: unknown }[]> {
    return db
      .from('boat_reservations')
      .where('organization_id', organizationId)
      .whereIn('boat_id', boatIds)
      .where('status', 'confirmed')
      .where('starts_at', '<', until)
      .where('ends_at', '>', from)
      .select('boat_id', 'starts_at', 'ends_at', 'total_price')
  }

  /**
   * Encaissé : factures payées dans la période, moins les avoirs remboursés
   * dans la période (#877) — même lecture que la carte « Facturation » du
   * tableau de bord. Rattachées à un bateau par leur réservation.
   */
  async #invoiceRows(
    organizationId: number,
    boatIds: number[],
    from: string,
    until: string,
    includeUnattributed: boolean
  ): Promise<{ boat_id: number | null; total: string | null }[]> {
    return db
      .from('invoices as i')
      .leftJoin('boat_reservations as r', 'r.id', 'i.reservation_id')
      .where('i.organization_id', organizationId)
      .where('i.status', 'paid')
      .whereIn('i.kind', ['invoice', 'credit_note'])
      .where('i.paid_at', '>=', from)
      .where('i.paid_at', '<', until)
      .where((q) => {
        q.whereIn('r.boat_id', boatIds)
        if (includeUnattributed) q.orWhereNull('r.boat_id')
      })
      .select(db.raw('r.boat_id as boat_id'))
      .select(
        db.raw("sum(case when i.kind = 'credit_note' then -i.total else i.total end) as total")
      )
      .groupBy('r.boat_id')
  }

  /** Heures moteur et milles des sorties parties dans la période (#887). */
  async #navigationRows(
    boatIds: number[],
    from: string,
    until: string
  ): Promise<{ boat_id: number; engine_hours: string | null; distance_nm: string | null }[]> {
    return db
      .from('navigation_logs')
      .whereIn('boat_id', boatIds)
      .where('departed_at', '>=', from)
      .where('departed_at', '<', until)
      .select('boat_id')
      .select(
        db.raw(
          'sum(case when engine_hours_end >= engine_hours_start then engine_hours_end - engine_hours_start else 0 end) as engine_hours'
        )
      )
      .select(db.raw('sum(coalesce(distance_nm, 0)) as distance_nm'))
      .groupBy('boat_id')
  }
}
