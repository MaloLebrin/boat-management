import type Boat from '#models/boat'
import type { BudgetData, BudgetMonthlyData, BudgetYearSummary } from '#shared/types/budget'
import type { DashboardSpendSummary } from '#shared/types/dashboard'
import db from '@adonisjs/lucid/services/db'
import type { DateTime } from 'luxon'

interface MonthRow {
  month: number
  total: string | null
}

const EMPTY_SUMMARY: BudgetYearSummary = {
  maintenance: 0,
  fuel: 0,
  documents: 0,
  port: 0,
  equipment: 0,
  entries: 0,
  total: 0,
}

/**
 * Dépenses par poste et par mois. Toutes les requêtes portent sur une liste de
 * bateaux (#832) : la page budget d'un bateau passe `[boat.id]`, le tableau de
 * bord passe toute la flotte de l'organisation.
 */
export default class BudgetService {
  private buildEmptyMonthly(): BudgetMonthlyData[] {
    return Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      maintenance: 0,
      fuel: 0,
      documents: 0,
      port: 0,
      equipment: 0,
      entries: 0,
      total: 0,
    }))
  }

  private indexByMonth(rows: MonthRow[]): Map<number, number> {
    const map = new Map<number, number>()
    for (const row of rows) {
      map.set(Number(row.month), row.total ? Number.parseFloat(row.total) : 0)
    }
    return map
  }

  private async fetchMaintenanceByMonth(boatIds: number[], year: number): Promise<MonthRow[]> {
    return db
      .from('boat_maintenance_events as me')
      .join('boat_maintenance_parts as p', 'p.maintenance_event_id', 'me.id')
      .whereIn('me.boat_id', boatIds)
      .whereRaw('EXTRACT(YEAR FROM me.performed_at) = ?', [year])
      .whereNotNull('p.unit_price')
      .select(db.raw('EXTRACT(MONTH FROM me.performed_at)::int as month'))
      .select(db.raw('SUM(p.unit_price * COALESCE(p.quantity, 1)) as total'))
      .groupByRaw('EXTRACT(MONTH FROM me.performed_at)')
  }

  private async fetchFuelByMonth(boatIds: number[], year: number): Promise<MonthRow[]> {
    return db
      .from('boat_fuel_logs')
      .whereIn('boat_id', boatIds)
      .whereRaw('EXTRACT(YEAR FROM fueled_at) = ?', [year])
      .whereNotNull('total_cost')
      .select(db.raw('EXTRACT(MONTH FROM fueled_at)::int as month'))
      .sum('total_cost as total')
      .groupByRaw('EXTRACT(MONTH FROM fueled_at)')
  }

  private async fetchDocumentsByMonth(boatIds: number[], year: number): Promise<MonthRow[]> {
    return db
      .from('boat_documents')
      .whereIn('boat_id', boatIds)
      .whereRaw('EXTRACT(YEAR FROM COALESCE(issued_at, created_at)) = ?', [year])
      .whereNotNull('cost')
      .select(db.raw('EXTRACT(MONTH FROM COALESCE(issued_at, created_at))::int as month'))
      .sum('cost as total')
      .groupByRaw('EXTRACT(MONTH FROM COALESCE(issued_at, created_at))')
  }

  private async fetchPortByMonth(boatIds: number[], year: number): Promise<MonthRow[]> {
    return db
      .from('boat_port_stays')
      .whereIn('boat_id', boatIds)
      .whereRaw('EXTRACT(YEAR FROM started_at) = ?', [year])
      .whereNotNull('cost')
      .select(db.raw('EXTRACT(MONTH FROM started_at)::int as month'))
      .sum('cost as total')
      .groupByRaw('EXTRACT(MONTH FROM started_at)')
  }

  private purchasesByMonth(table: string, boatIds: number[], year: number) {
    return db
      .from(table)
      .whereIn('boat_id', boatIds)
      .whereNotNull('purchase_price')
      .whereNotNull('purchased_at')
      .whereRaw('EXTRACT(YEAR FROM purchased_at) = ?', [year])
      .select(db.raw('EXTRACT(MONTH FROM purchased_at)::int as month'))
      .sum('purchase_price as total')
      .groupByRaw('EXTRACT(MONTH FROM purchased_at)')
  }

  private async fetchEquipmentByMonth(boatIds: number[], year: number): Promise<MonthRow[]> {
    const [genericRows, safetyRows, sailRows, enginePartRows] = await Promise.all([
      this.purchasesByMonth('boat_generic_equipment', boatIds, year),
      this.purchasesByMonth('boat_safety_equipment', boatIds, year),
      this.purchasesByMonth('boat_sails', boatIds, year),
      db
        .from('boat_engine_parts as bep')
        .join('boat_engines as be', 'be.id', 'bep.boat_engine_id')
        .whereIn('be.boat_id', boatIds)
        .whereNotNull('bep.purchase_price')
        .whereNotNull('bep.purchased_at')
        .whereRaw('EXTRACT(YEAR FROM bep.purchased_at) = ?', [year])
        .select(db.raw('EXTRACT(MONTH FROM bep.purchased_at)::int as month'))
        .sum('bep.purchase_price as total')
        .groupByRaw('EXTRACT(MONTH FROM bep.purchased_at)'),
    ])

    const combined = new Map<number, number>()
    for (const rows of [genericRows, safetyRows, sailRows, enginePartRows] as MonthRow[][]) {
      for (const row of rows) {
        const m = Number(row.month)
        combined.set(m, (combined.get(m) ?? 0) + (row.total ? Number.parseFloat(row.total) : 0))
      }
    }
    return Array.from(combined.entries()).map(([month, total]) => ({
      month,
      total: String(total),
    }))
  }

  private async fetchEntriesByMonth(boatIds: number[], year: number): Promise<MonthRow[]> {
    return db
      .from('boat_budget_entries')
      .whereIn('boat_id', boatIds)
      .whereRaw('EXTRACT(YEAR FROM date) = ?', [year])
      .select(db.raw('EXTRACT(MONTH FROM date)::int as month'))
      .sum('amount as total')
      .groupByRaw('EXTRACT(MONTH FROM date)')
  }

  /** Les 12 mois d'une année pour un périmètre de bateaux (6 postes, 9 requêtes). */
  private async computeMonthly(boatIds: number[], year: number): Promise<BudgetMonthlyData[]> {
    if (boatIds.length === 0) return this.buildEmptyMonthly()

    const [maintenanceRows, fuelRows, documentRows, portRows, equipmentRows, entriesRows] =
      await Promise.all([
        this.fetchMaintenanceByMonth(boatIds, year),
        this.fetchFuelByMonth(boatIds, year),
        this.fetchDocumentsByMonth(boatIds, year),
        this.fetchPortByMonth(boatIds, year),
        this.fetchEquipmentByMonth(boatIds, year),
        this.fetchEntriesByMonth(boatIds, year),
      ])

    const maintenanceByMonth = this.indexByMonth(maintenanceRows)
    const fuelByMonth = this.indexByMonth(fuelRows)
    const documentsByMonth = this.indexByMonth(documentRows)
    const portByMonth = this.indexByMonth(portRows)
    const equipmentByMonth = this.indexByMonth(equipmentRows)
    const entriesByMonth = this.indexByMonth(entriesRows)

    return this.buildEmptyMonthly().map((row) => {
      const maintenance = maintenanceByMonth.get(row.month) ?? 0
      const fuel = fuelByMonth.get(row.month) ?? 0
      const documents = documentsByMonth.get(row.month) ?? 0
      const port = portByMonth.get(row.month) ?? 0
      const equipment = equipmentByMonth.get(row.month) ?? 0
      const entries = entriesByMonth.get(row.month) ?? 0
      return {
        ...row,
        maintenance,
        fuel,
        documents,
        port,
        equipment,
        entries,
        total: maintenance + fuel + documents + port + equipment + entries,
      }
    })
  }

  /** Somme des mois `1..throughMonth` (12 = année entière). */
  private sumMonths(monthly: BudgetMonthlyData[], throughMonth: number): BudgetYearSummary {
    const summary: BudgetYearSummary = { ...EMPTY_SUMMARY }
    for (const row of monthly) {
      if (row.month > throughMonth) continue
      summary.maintenance += row.maintenance
      summary.fuel += row.fuel
      summary.documents += row.documents
      summary.port += row.port
      summary.equipment += row.equipment
      summary.entries += row.entries
      summary.total += row.total
    }
    return summary
  }

  async getForBoats(boatIds: number[], year: number): Promise<BudgetData> {
    const [monthly, previousMonthly] = await Promise.all([
      this.computeMonthly(boatIds, year),
      this.computeMonthly(boatIds, year - 1),
    ])
    const previousYearTotals = this.sumMonths(previousMonthly, 12)
    return {
      year,
      monthly,
      totals: this.sumMonths(monthly, 12),
      previousYearTotals: previousYearTotals.total > 0 ? previousYearTotals : null,
    }
  }

  async getForBoat(boat: Boat, year: number): Promise<BudgetData> {
    return this.getForBoats([boat.id], year)
  }

  /**
   * Dépenses de l'organisation depuis le 1er janvier, comparées à la **même
   * période** de l'année précédente (mois 1..courant) — tableau de bord (#832).
   */
  async getOrgSpendSummary(boatIds: number[], now: DateTime): Promise<DashboardSpendSummary> {
    const year = now.year
    const throughMonth = now.month
    const [monthly, previousMonthly] = await Promise.all([
      this.computeMonthly(boatIds, year),
      this.computeMonthly(boatIds, year - 1),
    ])
    const previousYearToDate = this.sumMonths(previousMonthly, throughMonth)
    return {
      year,
      throughMonth,
      totals: this.sumMonths(monthly, throughMonth),
      previousYearToDate: previousYearToDate.total > 0 ? previousYearToDate : null,
      singleBoatId: boatIds.length === 1 ? boatIds[0]! : null,
    }
  }
}
