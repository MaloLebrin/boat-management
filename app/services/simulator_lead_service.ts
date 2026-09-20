import SimulatorLead from '#models/simulator_lead'
import SimulatorLeadCreated from '#events/simulator_lead_created'
import { SIMULATOR_LEAD_RETENTION_DAYS } from '#shared/constants/data_retention'
import { DateTime } from 'luxon'
import type { SimulatorBenchmarkMap, SimulatorLeadPayload } from '#shared/types/simulator'
import db from '@adonisjs/lucid/services/db'

export default class SimulatorLeadService {
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
        // `updatedAt` est poussé explicitement (#775). En `autoUpdate` seul,
        // Lucid ne sauvegarde que si un attribut a changé : un visiteur qui
        // refait **la même** simulation ne rendait la ligne dirty par aucun
        // champ, la date restait figée, et la rétention le supprimait alors
        // qu'il venait de se manifester. Ce qui datte ici, c'est le contact,
        // pas la modification.
        updatedAt: DateTime.now(),
      }
    )

    await SimulatorLeadCreated.dispatch(lead)

    return lead
  }

  /**
   * Supprime les leads au-delà de la rétention (#775).
   *
   * Le compteur part de `updatedAt`, pas de `createdAt` : `create()` fait un
   * `updateOrCreate` clé sur l'e-mail, donc un visiteur qui refait une
   * simulation réécrit sa ligne. Compter depuis la première visite
   * supprimerait un prospect encore actif — c'est aussi ce que demande la
   * règle de prospection, qui court depuis le **dernier** contact.
   *
   * Rend le nombre de lignes supprimées.
   */
  async purgeExpired(retentionDays = SIMULATOR_LEAD_RETENTION_DAYS): Promise<number> {
    const cutoff = DateTime.now().minus({ days: retentionDays })

    // `delete()` rend `[count]` sur PostgreSQL.
    const deleted = await SimulatorLead.query().where('updatedAt', '<', cutoff.toISO()).delete()

    return Number(deleted[0] ?? 0)
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
