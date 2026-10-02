import AccountService from '#services/account_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

/**
 * Purge quotidienne des comptes au terme du délai de rétractation de 14 jours (#886) : anonymisation, adhésions et accès supprimés.
 */
@inject()
export default class PurgeDeletedAccounts extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  constructor(private accountService: AccountService) {
    super()
  }

  async execute() {
    const purged = await this.accountService.purgeExpired()
    logger.info({ purged }, 'PurgeDeletedAccounts: purge complete')
  }

  async failed(error: Error) {
    logger.error({ error }, 'PurgeDeletedAccounts: job failed')
  }
}
