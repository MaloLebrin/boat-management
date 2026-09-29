import ExternalCalendarService from '#services/external_calendar_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

/**
 * Relit toutes les 30 minutes les calendriers externes importés (#880) : une
 * location prise sur une plateforme bloque les dates dans FleetAi avant qu'un
 * second client ne les réserve.
 */
@inject()
export default class SyncExternalCalendars extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    // La prochaine passe est dans 30 minutes : pas de nouvel essai.
    maxRetries: 0,
  }

  constructor(private externalCalendarService: ExternalCalendarService) {
    super()
  }

  async execute() {
    const stats = await this.externalCalendarService.syncAll()
    logger.info(stats, 'SyncExternalCalendars: sync complete')
  }

  async failed(error: Error) {
    logger.error({ error }, 'SyncExternalCalendars: job failed')
  }
}
