import NotificationScanService from '#services/notification_scan_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

@inject()
export default class ScanFleetNotifications extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  constructor(private notificationScanService: NotificationScanService) {
    super()
  }

  async execute() {
    logger.info('ScanFleetNotifications: starting run')
    const { created } = await this.notificationScanService.run()
    logger.info({ created }, 'ScanFleetNotifications: run complete')
  }

  async failed(error: Error) {
    logger.error({ error }, 'ScanFleetNotifications: job failed')
  }
}
