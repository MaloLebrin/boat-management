import AiTokenQuotaService from '#services/ai_token_quota_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { DateTime } from 'luxon'

@inject()
export default class ResetAiTokenUsage extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  constructor(private aiTokenQuotaService: AiTokenQuotaService) {
    super()
  }

  async execute() {
    // Reset the previous month's usage (job runs on 1st of new month)
    const previousMonth = DateTime.now().minus({ months: 1 }).toFormat('yyyy-MM')
    logger.info({ month: previousMonth }, 'ResetAiTokenUsage: starting reset')
    await this.aiTokenQuotaService.resetMonth(previousMonth)
    logger.info({ month: previousMonth }, 'ResetAiTokenUsage: reset complete')
  }

  async failed(error: Error) {
    logger.error({ error }, 'ResetAiTokenUsage: job failed')
  }
}
