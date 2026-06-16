import AuditLogService from '#services/audit_log_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

@inject()
export default class PurgeAuditLogs extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  constructor(private auditLogService: AuditLogService) {
    super()
  }

  async execute() {
    logger.info('PurgeAuditLogs: starting purge run')
    await this.auditLogService.purgeExpired()
    logger.info('PurgeAuditLogs: purge complete')
  }

  async failed(error: Error) {
    logger.error({ error }, 'PurgeAuditLogs: job failed')
  }
}
