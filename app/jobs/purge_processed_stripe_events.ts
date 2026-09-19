import StripeWebhookService from '#services/stripe_webhook_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

/**
 * Purge des traces d'événements Stripe traités (#703).
 *
 * La déduplication par `event.id` n'a d'intérêt que le temps où Stripe peut
 * rejouer — trois jours au plus. Sans purge, la table grossirait indéfiniment
 * pour garder des lignes qui ne servent plus à rien.
 */
@inject()
export default class PurgeProcessedStripeEvents extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  constructor(private stripeWebhookService: StripeWebhookService) {
    super()
  }

  async execute() {
    logger.info('PurgeProcessedStripeEvents: starting purge run')
    const deleted = await this.stripeWebhookService.purgeExpired()
    logger.info({ deleted }, 'PurgeProcessedStripeEvents: purge complete')
  }

  async failed(error: Error) {
    logger.error({ error }, 'PurgeProcessedStripeEvents: job failed')
  }
}
