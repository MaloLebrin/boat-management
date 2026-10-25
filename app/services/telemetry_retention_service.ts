import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import {
  AIS_SIGHTING_RETENTION_DAYS,
  TELEMETRY_SAMPLE_RETENTION_DAYS,
} from '#shared/constants/data_retention'
import type { PlanTier } from '#shared/types/plan'

/**
 * Purge des relevés d'instruments (#992) et des cibles AIS (#1009) expirés. La durée dépend du plan de
 * l'organisation propriétaire du bateau ; une suppression par plan, bornée par
 * l'index `(boat_id, path, recorded_at)`, plutôt qu'une jointure ligne à ligne.
 */
export default class TelemetryRetentionService {
  /** Supprime les relevés plus vieux que la rétention de leur plan ; retourne le nombre de lignes. */
  async purgeExpired(now: DateTime = DateTime.now()): Promise<number> {
    let deleted = 0
    for (const plan of Object.keys(TELEMETRY_SAMPLE_RETENTION_DAYS) as PlanTier[]) {
      deleted += await this.purgeTable(
        'boat_telemetry_samples',
        plan,
        now,
        TELEMETRY_SAMPLE_RETENTION_DAYS
      )
      // Cibles AIS (#1009) : des tiers, conservés bien moins longtemps.
      deleted += await this.purgeTable('boat_ais_sightings', plan, now, AIS_SIGHTING_RETENTION_DAYS)
    }
    return deleted
  }

  private async purgeTable(
    table: 'boat_telemetry_samples' | 'boat_ais_sightings',
    plan: PlanTier,
    now: DateTime,
    retentionDays: Record<PlanTier, number>
  ): Promise<number> {
    const cutoff = now.minus({ days: retentionDays[plan] }).toUTC().toISO()!
    const result = await db.rawQuery(
      `delete from ${table}
       where recorded_at < ?
         and boat_id in (
           select b.id from boats b
           join organizations o on o.id = b.organization_id
           where o.plan = ?
         )`,
      [cutoff, plan]
    )
    return result.rowCount ?? 0
  }
}
