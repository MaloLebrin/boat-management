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
      port: 0,
      equipment: 0,
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

  private async fetchPortByMonth(boatId: number, year: number): Promise<MonthRow[]> {
    return db
      .from('boat_port_stays')
      .where('boat_id', boatId)
      .whereRaw('EXTRACT(YEAR FROM started_at) = ?', [year])
      .whereNotNull('cost')
      .select(db.raw('EXTRACT(MONTH FROM started_at)::int as month'))
      .sum('cost as total')
      .groupByRaw('EXTRACT(MONTH FROM started_at)')
  }

  private async fetchEquipmentByMonth(boatId: number, year: number): Promise<MonthRow[]> {
    const genericRows = await db
      .from('boat_generic_equipment')
      .where('boat_id', boatId)
      .whereNotNull('purchase_price')
      .whereNotNull('purchased_at')
      .whereRaw('EXTRACT(YEAR FROM purchased_at) = ?', [year])
      .select(db.raw('EXTRACT(MONTH FROM purchased_at)::int as month'))
      .sum('purchase_price as total')
      .groupByRaw('EXTRACT(MONTH FROM purchased_at)')

    const safetyRows = await db
      .from('boat_safety_equipment')
      .where('boat_id', boatId)
      .whereNotNull('purchase_price')
      .whereNotNull('purchased_at')
      .whereRaw('EXTRACT(YEAR FROM purchased_at) = ?', [year])
      .select(db.raw('EXTRACT(MONTH FROM purchased_at)::int as month'))
      .sum('purchase_price as total')
      .groupByRaw('EXTRACT(MONTH FROM purchased_at)')

    const sailRows = await db
      .from('boat_sails')
      .where('boat_id', boatId)
      .whereNotNull('purchase_price')
      .whereNotNull('purchased_at')
      .whereRaw('EXTRACT(YEAR FROM purchased_at) = ?', [year])
      .select(db.raw('EXTRACT(MONTH FROM purchased_at)::int as month'))
      .sum('purchase_price as total')
      .groupByRaw('EXTRACT(MONTH FROM purchased_at)')

    const enginePartRows = await db
      .from('boat_engine_parts as bep')
      .join('boat_engines as be', 'be.id', 'bep.boat_engine_id')
      .where('be.boat_id', boatId)
      .whereNotNull('bep.purchase_price')
      .whereNotNull('bep.purchased_at')
      .whereRaw('EXTRACT(YEAR FROM bep.purchased_at) = ?', [year])
      .select(db.raw('EXTRACT(MONTH FROM bep.purchased_at)::int as month'))
      .sum('bep.purchase_price as total')
      .groupByRaw('EXTRACT(MONTH FROM bep.purchased_at)')

    const combined = new Map<number, number>()
    for (const rows of [genericRows, safetyRows, sailRows, enginePartRows]) {
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

  private async computeYearSummary(boatId: number, year: number): Promise<BudgetYearSummary> {
    const [maintenanceRows, fuelRows, documentRows, portRows, equipmentRows] = await Promise.all([
      this.fetchMaintenanceByMonth(boatId, year),
      this.fetchFuelByMonth(boatId, year),
      this.fetchDocumentsByMonth(boatId, year),
      this.fetchPortByMonth(boatId, year),
      this.fetchEquipmentByMonth(boatId, year),
    ])

    const sumRows = (rows: MonthRow[]) =>
      rows.reduce((acc, r) => acc + (r.total ? Number.parseFloat(r.total) : 0), 0)

    const maintenance = sumRows(maintenanceRows)
    const fuel = sumRows(fuelRows)
    const documents = sumRows(documentRows)
    const port = sumRows(portRows)
    const equipment = sumRows(equipmentRows)

    return {
      maintenance,
      fuel,
      documents,
      port,
      equipment,
      total: maintenance + fuel + documents + port + equipment,
    }
  }

  async getForBoat(boat: Boat, year: number): Promise<BudgetData> {
    const [maintenanceRows, fuelRows, documentRows, portRows, equipmentRows, previousYearTotals] =
      await Promise.all([
        this.fetchMaintenanceByMonth(boat.id, year),
        this.fetchFuelByMonth(boat.id, year),
        this.fetchDocumentsByMonth(boat.id, year),
        this.fetchPortByMonth(boat.id, year),
        this.fetchEquipmentByMonth(boat.id, year),
        this.computeYearSummary(boat.id, year - 1),
      ])

    const maintenanceByMonth = this.indexByMonth(maintenanceRows)
    const fuelByMonth = this.indexByMonth(fuelRows)
    const documentsByMonth = this.indexByMonth(documentRows)
    const portByMonth = this.indexByMonth(portRows)
    const equipmentByMonth = this.indexByMonth(equipmentRows)

    const monthly = this.buildEmptyMonthly().map((row) => {
      const maintenance = maintenanceByMonth.get(row.month) ?? 0
      const fuel = fuelByMonth.get(row.month) ?? 0
      const documents = documentsByMonth.get(row.month) ?? 0
      const port = portByMonth.get(row.month) ?? 0
      const equipment = equipmentByMonth.get(row.month) ?? 0
      return {
        ...row,
        maintenance,
        fuel,
        documents,
        port,
        equipment,
        total: maintenance + fuel + documents + port + equipment,
      }
    })

    const totals = monthly.reduce(
      (acc, m) => ({
        maintenance: acc.maintenance + m.maintenance,
        fuel: acc.fuel + m.fuel,
        documents: acc.documents + m.documents,
        port: acc.port + m.port,
        equipment: acc.equipment + m.equipment,
        total: acc.total + m.total,
      }),
      { maintenance: 0, fuel: 0, documents: 0, port: 0, equipment: 0, total: 0 }
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
