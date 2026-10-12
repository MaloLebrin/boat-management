import FleetDigestService from '#services/fleet_digest_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

/** Synthèse hebdomadaire de flotte (#871) : le lundi, chaque organisation. */
@inject()
export default class SendWeeklyFleetDigests extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'emails',
    maxRetries: 2,
  }

  constructor(private digestService: FleetDigestService) {
    super()
  }

  async execute() {
    const sent = await this.digestService.sendWeekly()
    logger.info({ sent }, 'SendWeeklyFleetDigests: digests queued')
  }

  async failed(error: Error) {
    logger.error({ error }, 'SendWeeklyFleetDigests: job failed')
  }
}
