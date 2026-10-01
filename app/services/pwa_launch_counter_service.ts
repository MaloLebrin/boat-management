import db from '@adonisjs/lucid/services/db'
import PwaLaunchCounter from '#models/pwa_launch_counter'

/**
 * Compteur de lancements PWA (#865). Pas d'analytics tiers : un entier par
 * organisation, incrémenté quand le tableau de bord est ouvert avec
 * `?source=pwa` (le `start_url` du manifeste).
 */
export default class PwaLaunchCounterService {
  async increment(organizationId: number): Promise<void> {
    await db.rawQuery(
      `insert into pwa_launch_counters (organization_id, launches, created_at, updated_at)
       values (?, 1, now(), now())
       on conflict (organization_id)
       do update set launches = pwa_launch_counters.launches + 1, updated_at = now()`,
      [organizationId]
    )
  }

  async countFor(organizationId: number): Promise<number> {
    const row = await PwaLaunchCounter.findBy('organizationId', organizationId)
    return row?.launches ?? 0
  }
}
