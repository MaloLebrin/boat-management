import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import QueueDedupService from '#services/queue_dedup_service'

export interface GenerateExportPayload {
  organizationId: number
  requestedByUserId: number
  exportId: string
  kind: 'csv' | 'pdf'
  dedupKey: string
}

export default class GenerateExport extends Job<GenerateExportPayload> {
  static options: JobOptions = {
    queue: 'exports',
    maxRetries: 3,
  }

  static dedupKey(payload: Omit<GenerateExportPayload, 'dedupKey'>) {
    return `export:${payload.organizationId}:${payload.kind}:${payload.exportId}`
  }

  async execute() {
    const dedup = new QueueDedupService()
    await dedup.markRunning(this.payload.dedupKey)

    logger.info(
      { exportId: this.payload.exportId, kind: this.payload.kind },
      'Export job placeholder executed'
    )

    await dedup.markCompleted(this.payload.dedupKey)
  }

  async failed(error: Error) {
    const dedup = new QueueDedupService()
    await dedup.markFailed(this.payload.dedupKey, error)
  }
}
