import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import QueueDedupService from '#services/queue_dedup_service'

export interface ProcessMediaPayload {
  organizationId: number
  requestedByUserId: number
  mediaId: string
  action: 'resize' | 'transcode' | 'optimize'
  dedupKey: string
}

export default class ProcessMedia extends Job<ProcessMediaPayload> {
  static options: JobOptions = {
    queue: 'media',
    maxRetries: 5,
  }

  static dedupKey(payload: Omit<ProcessMediaPayload, 'dedupKey'>) {
    return `media:${payload.organizationId}:${payload.action}:${payload.mediaId}`
  }

  async execute() {
    const dedup = new QueueDedupService()
    await dedup.markRunning(this.payload.dedupKey)

    logger.info(
      { mediaId: this.payload.mediaId, action: this.payload.action },
      'Media job placeholder executed'
    )

    await dedup.markCompleted(this.payload.dedupKey)
  }

  async failed(error: Error) {
    const dedup = new QueueDedupService()
    await dedup.markFailed(this.payload.dedupKey, error)
  }
}
