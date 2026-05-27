import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import QueueDedupService from '#services/queue_dedup_service'
import { inject } from '@adonisjs/core'

export interface ProcessMediaPayload {
  organizationId: number
  requestedByUserId: number
  mediaId: string
  action: 'resize' | 'transcode' | 'optimize'
  dedupKey: string
}

@inject()
export default class ProcessMedia extends Job<ProcessMediaPayload> {
  static options: JobOptions = {
    queue: 'media',
    maxRetries: 5,
  }

  constructor(private dedupService: QueueDedupService) {
    super()
  }

  static dedupKey(payload: Omit<ProcessMediaPayload, 'dedupKey'>) {
    return `media:${payload.organizationId}:${payload.action}:${payload.mediaId}`
  }

  async execute() {
    await this.dedupService.markRunning(this.payload.dedupKey)

    logger.info(
      { mediaId: this.payload.mediaId, action: this.payload.action },
      'Media job placeholder executed'
    )

    await this.dedupService.markCompleted(this.payload.dedupKey)
  }

  async failed(error: Error) {
    await this.dedupService.markFailed(this.payload.dedupKey, error)
  }
}
