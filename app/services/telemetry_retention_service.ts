import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { TELEMETRY_SAMPLE_RETENTION_DAYS } from '#shared/constants/data_retention'
import type { PlanTier } from '#shared/types/plan'

/**
 * Purge des relevés d'instruments expirés (#992). La durée dépend du plan de
 * l'organisation propriétaire du bateau ; une suppression par plan, bornée par
 * l'index `(boat_id, path, recorded_at)`, plutôt qu'une jointure ligne à ligne.
 */
export default class TelemetryRetentionService {
  /** Supprime les relevés plus vieux que la rétention de leur plan ; retourne le nombre de lignes. */
  async purgeExpired(now: DateTime = DateTime.now()): Promise<number> {
    let deleted = 0
    for (const plan of Object.keys(TELEMETRY_SAMPLE_RETENTION_DAYS) as PlanTier[]) {
      const cutoff = now.minus({ days: TELEMETRY_SAMPLE_RETENTION_DAYS[plan] }).toUTC().toISO()!
      const result = await db.rawQuery(
        `delete from boat_telemetry_samples
         where recorded_at < ?
           and boat_id in (
             select b.id from boats b
             join organizations o on o.id = b.organization_id
             where o.plan = ?
           )`,
        [cutoff, plan]
      )
      deleted += result.rowCount ?? 0
    }
    return deleted
  }
}
