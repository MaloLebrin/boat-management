import NotificationDispatcherService from '#services/notification_dispatcher_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

/**
 * Résumé quotidien des e-mails de notification (#888). Le cron est horaire :
 * chaque passage sert les utilisateurs pour qui il est 8h dans leur fuseau.
 */
@inject()
export default class SendNotificationDigests extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  constructor(private dispatcher: NotificationDispatcherService) {
    super()
  }

  async execute() {
    const sent = await this.dispatcher.sendDigests()
    logger.info({ sent }, 'SendNotificationDigests: digests queued')
  }

  async failed(error: Error) {
    logger.error({ error }, 'SendNotificationDigests: job failed')
  }
}
