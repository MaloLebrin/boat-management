import DemoService from '#services/demo_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

@inject()
export default class ResetDemoData extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  constructor(private demoService: DemoService) {
    super()
  }

  async execute() {
    logger.info('ResetDemoData: starting')
    await this.demoService.reset()
    logger.info('ResetDemoData: done')
  }

  async failed(error: Error) {
    logger.error({ error }, 'ResetDemoData: job failed')
  }
}
