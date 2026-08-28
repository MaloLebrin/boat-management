import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import type { HealthReport } from '#shared/types/health'

/**
 * Vérifie que l'app peut servir du trafic (issue #541).
 *
 * Un `select 1` suffit : il valide à la fois que le pool Postgres est ouvert et
 * que la base répond. Une erreur n'est jamais propagée — la probe doit répondre
 * 503, pas planter sur une page 500.
 */
export default class HealthService {
  async check(): Promise<HealthReport> {
    try {
      await db.rawQuery('select 1')

      return { status: 'ok', checks: { database: 'ok' } }
    } catch (error) {
      logger.error({ err: error }, 'Healthcheck: la base de données ne répond pas')

      return { status: 'error', checks: { database: 'error' } }
    }
  }
}
