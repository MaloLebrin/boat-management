import TelemetryRetentionService from '#services/telemetry_retention_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

/**
 * Purge quotidienne des relevés d'instruments au-delà de la rétention du plan
 * (#992) : `boat_telemetry_samples` est la table qui grossit le plus vite.
 */
@inject()
export default class PurgeTelemetrySamples extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  constructor(private retentionService: TelemetryRetentionService) {
    super()
  }

  async execute() {
    const deleted = await this.retentionService.purgeExpired()
    logger.info({ deleted }, 'PurgeTelemetrySamples: purge complete')
  }

  async failed(error: Error) {
    logger.error({ error }, 'PurgeTelemetrySamples: job failed')
  }
}
