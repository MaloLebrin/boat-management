import BoatTrashService from '#services/boat_trash_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

/**
 * Purge quotidienne des bateaux en corbeille depuis plus de 30 jours (#858).
 * Réutilise le nettoyage Cloudinary de la suppression physique.
 */
@inject()
export default class PurgeTrashedBoats extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  constructor(private boatTrashService: BoatTrashService) {
    super()
  }

  async execute() {
    const purged = await this.boatTrashService.purgeExpired()
    logger.info({ purged }, 'PurgeTrashedBoats: purge complete')
  }

  async failed(error: Error) {
    logger.error({ error }, 'PurgeTrashedBoats: job failed')
  }
}
