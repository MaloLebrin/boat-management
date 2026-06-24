import type Boat from '#models/boat'
import type { BudgetData, BudgetMonthlyData, BudgetYearSummary } from '#shared/types/budget'

interface MonthRow {
  month: number
  total: string | null
}
import db from '@adonisjs/lucid/services/db'

export default class BudgetService {
  private buildEmptyMonthly(): BudgetMonthlyData[] {
    return Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      maintenance: 0,
      fuel: 0,
      documents: 0,
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

  private async fetchMaintenanceByMonth(boatId: number, year: number): Promise<MonthRow[]> {
    return db
      .from('boat_maintenance_events as me')
      .join('boat_maintenance_parts as p', 'p.maintenance_event_id', 'me.id')
      .where('me.boat_id', boatId)
      .whereRaw('EXTRACT(YEAR FROM me.performed_at) = ?', [year])
      .whereNotNull('p.unit_price')
      .select(db.raw('EXTRACT(MONTH FROM me.performed_at)::int as month'))
      .select(db.raw('SUM(p.unit_price * COALESCE(p.quantity, 1)) as total'))
      .groupByRaw('EXTRACT(MONTH FROM me.performed_at)')
  }

  private async fetchFuelByMonth(boatId: number, year: number): Promise<MonthRow[]> {
    return db
      .from('boat_fuel_logs')
      .where('boat_id', boatId)
      .whereRaw('EXTRACT(YEAR FROM fueled_at) = ?', [year])
      .whereNotNull('total_cost')
      .select(db.raw('EXTRACT(MONTH FROM fueled_at)::int as month'))
      .sum('total_cost as total')
      .groupByRaw('EXTRACT(MONTH FROM fueled_at)')
  }

  private async fetchDocumentsByMonth(boatId: number, year: number): Promise<MonthRow[]> {
    return db
      .from('boat_documents')
      .where('boat_id', boatId)
      .whereRaw('EXTRACT(YEAR FROM issued_at) = ?', [year])
      .whereNotNull('cost')
      .select(db.raw('EXTRACT(MONTH FROM issued_at)::int as month'))
      .sum('cost as total')
      .groupByRaw('EXTRACT(MONTH FROM issued_at)')
  }

  private async computeYearSummary(boatId: number, year: number): Promise<BudgetYearSummary> {
    const [maintenanceRows, fuelRows, documentRows] = await Promise.all([
      this.fetchMaintenanceByMonth(boatId, year),
      this.fetchFuelByMonth(boatId, year),
      this.fetchDocumentsByMonth(boatId, year),
    ])

    const sumRows = (rows: MonthRow[]) =>
      rows.reduce((acc, r) => acc + (r.total ? Number.parseFloat(r.total) : 0), 0)

    const maintenance = sumRows(maintenanceRows)
    const fuel = sumRows(fuelRows)
    const documents = sumRows(documentRows)

    return { maintenance, fuel, documents, total: maintenance + fuel + documents }
  }

  async getForBoat(boat: Boat, year: number): Promise<BudgetData> {
    const [maintenanceRows, fuelRows, documentRows, previousYearTotals] = await Promise.all([
      this.fetchMaintenanceByMonth(boat.id, year),
      this.fetchFuelByMonth(boat.id, year),
      this.fetchDocumentsByMonth(boat.id, year),
      this.computeYearSummary(boat.id, year - 1),
    ])

    const maintenanceByMonth = this.indexByMonth(maintenanceRows)
    const fuelByMonth = this.indexByMonth(fuelRows)
    const documentsByMonth = this.indexByMonth(documentRows)

    const monthly = this.buildEmptyMonthly().map((row) => {
      const maintenance = maintenanceByMonth.get(row.month) ?? 0
      const fuel = fuelByMonth.get(row.month) ?? 0
      const documents = documentsByMonth.get(row.month) ?? 0
      return { ...row, maintenance, fuel, documents, total: maintenance + fuel + documents }
    })

    const totals = monthly.reduce(
      (acc, m) => ({
        maintenance: acc.maintenance + m.maintenance,
        fuel: acc.fuel + m.fuel,
        documents: acc.documents + m.documents,
        total: acc.total + m.total,
      }),
      { maintenance: 0, fuel: 0, documents: 0, total: 0 }
    )

    const hasPreviousData = previousYearTotals.total > 0

    return {
      year,
      monthly,
      totals,
      previousYearTotals: hasPreviousData ? previousYearTotals : null,
    }
  }
}
