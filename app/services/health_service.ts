import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import pushConfig from '#config/push'
import type { HealthReport } from '#shared/types/health'

let vapidMissingWarned = false

/**
 * Rapport de `/up`. Seule la base fait échouer la probe : des clés VAPID
 * absentes désactivent le push, elles ne rendent pas l'app incapable de
 * servir (#865). Un 503 recyclerait le conteneur.
 */
export function buildHealthReport(databaseOk: boolean, vapidEnabled: boolean): HealthReport {
  return {
    status: databaseOk ? 'ok' : 'error',
    checks: {
      database: databaseOk ? 'ok' : 'error',
      vapid: vapidEnabled ? 'ok' : 'missing',
    },
  }
}

/**
 * Vérifie que l'app peut servir du trafic (issue #541).
 *
 * Un `select 1` suffit : il valide à la fois que le pool Postgres est ouvert et
 * que la base répond. Une erreur n'est jamais propagée — la probe doit répondre
 * 503, pas planter sur une page 500.
 */
export default class HealthService {
  async check(): Promise<HealthReport> {
    this.warnIfVapidMissingInProduction()

    try {
      await db.rawQuery('select 1')

      return buildHealthReport(true, pushConfig.enabled)
    } catch (error) {
      logger.error({ err: error }, 'Healthcheck: la base de données ne répond pas')

      return buildHealthReport(false, pushConfig.enabled)
    }
  }

  private warnIfVapidMissingInProduction() {
    if (!app.inProduction || pushConfig.enabled || vapidMissingWarned) return

    vapidMissingWarned = true
    logger.warn('Web Push désactivé : VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY manquent en production')
  }
}
