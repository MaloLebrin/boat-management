import FleetDigestService from '#services/fleet_digest_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

/** Rapport mensuel de flotte (#871) : le 1er du mois, le mois écoulé. */
@inject()
export default class SendMonthlyFleetReports extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'emails',
    maxRetries: 2,
  }

  constructor(private digestService: FleetDigestService) {
    super()
  }

  async execute() {
    const sent = await this.digestService.sendMonthly()
    logger.info({ sent }, 'SendMonthlyFleetReports: reports queued')
  }

  async failed(error: Error) {
    logger.error({ error }, 'SendMonthlyFleetReports: job failed')
  }
}
