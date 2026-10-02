import OrganizationDeletionService from '#services/organization_deletion_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

/**
 * Purge quotidienne des organisations au terme de leur période de grâce de 30 jours (#886) : abonnement Stripe résilié, fichiers Cloudinary, bateaux puis données.
 */
@inject()
export default class PurgeDeletedOrganizations extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  constructor(private organizationDeletionService: OrganizationDeletionService) {
    super()
  }

  async execute() {
    const purged = await this.organizationDeletionService.purgeExpired()
    logger.info({ purged }, 'PurgeDeletedOrganizations: purge complete')
  }

  async failed(error: Error) {
    logger.error({ error }, 'PurgeDeletedOrganizations: job failed')
  }
}
