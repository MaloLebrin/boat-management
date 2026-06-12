import SimulatorLead from '#models/simulator_lead'
import EmailQueueService from '#services/email_queue_service'
import type { SimulatorBenchmarkMap, SimulatorLeadPayload } from '#shared/types/simulator'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'

@inject()
export default class SimulatorLeadService {
  constructor(private emailQueueService: EmailQueueService) {}

  async create(payload: SimulatorLeadPayload): Promise<SimulatorLead> {
    const lead = await SimulatorLead.updateOrCreate(
      { email: payload.email },
      {
        boatType: payload.boatType,
        lengthM: payload.lengthM,
        hullWear: payload.hullWear ?? null,
        engineWear: payload.engineWear ?? null,
        safetyWear: payload.safetyWear ?? null,
        riggingWear: payload.riggingWear ?? null,
        winteringZone: payload.winteringZone ?? null,
        totalMin: payload.totalMin,
        totalMax: payload.totalMax,
        locale: payload.locale ?? 'fr',
      }
    )

    await this.emailQueueService.sendSimulatorReport(lead)
    await this.emailQueueService.sendSimulatorNurturing(lead)

    return lead
  }

  /**
   * Retourne les benchmarks agrégés par type de bateau et tranche de longueur.
   * Seuls les groupes avec au moins 10 simulations sont inclus.
   */
  async getBenchmarks(): Promise<SimulatorBenchmarkMap> {
    const bracketSql = `CASE
      WHEN length_m < 6 THEN '<6'
      WHEN length_m < 9 THEN '6-9'
      WHEN length_m < 12 THEN '9-12'
      WHEN length_m < 15 THEN '12-15'
      ELSE '15+'
    END`

    const rows = await db
      .from(SimulatorLead.table)
      .select('boat_type')
      .select(db.raw(`${bracketSql} as length_bracket`))
      .avg('total_min as avg_min')
      .avg('total_max as avg_max')
      .count('* as cnt')
      .groupBy('boat_type')
      .groupByRaw(bracketSql)
      .havingRaw('COUNT(*) >= 10')

    const map: SimulatorBenchmarkMap = {}
    for (const row of rows as Array<{
      boat_type: string
      length_bracket: string
      avg_min: string
      avg_max: string
      cnt: string
    }>) {
      const key = `${row.boat_type}:${row.length_bracket}`
      map[key] = {
        avgMin: Math.round(Number(row.avg_min)),
        avgMax: Math.round(Number(row.avg_max)),
        count: Number(row.cnt),
      }
    }
    return map
  }
}
