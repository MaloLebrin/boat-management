import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

export interface ProcessMediaPayload {
  organizationId: number
  requestedByUserId: number
  mediaId: string
  action: 'resize' | 'transcode' | 'optimize'
}

export default class ProcessMedia extends Job<ProcessMediaPayload> {
  static options: JobOptions = {
    queue: 'media',
    maxRetries: 5,
  }

  async execute() {
    logger.info(
      { mediaId: this.payload.mediaId, action: this.payload.action },
      'Media job placeholder executed'
    )
  }
}
