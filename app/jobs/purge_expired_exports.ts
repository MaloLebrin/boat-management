import DataExportService from '#services/data_export_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

/**
 * Purge quotidienne des exports générés en arrière-plan (#879) une fois leur
 * `expires_at` passé : le fichier vit en base et peut porter des données
 * clients.
 */
@inject()
export default class PurgeExpiredExports extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  constructor(private dataExportService: DataExportService) {
    super()
  }

  async execute() {
    const deleted = await this.dataExportService.purgeExpired()
    logger.info({ deleted }, 'PurgeExpiredExports: purge complete')
  }

  async failed(error: Error) {
    logger.error({ error }, 'PurgeExpiredExports: job failed')
  }
}
