import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import QueueDedupService from '#services/queue_dedup_service'
import { inject } from '@adonisjs/core'

export interface GenerateExportPayload {
  organizationId: number
  requestedByUserId: number
  exportId: string
  kind: 'csv' | 'pdf'
  dedupKey: string
}

@inject()
export default class GenerateExport extends Job<GenerateExportPayload> {
  static options: JobOptions = {
    queue: 'exports',
    maxRetries: 3,
  }

  constructor(private dedupService: QueueDedupService) {
    super()
  }

  static dedupKey(payload: Omit<GenerateExportPayload, 'dedupKey'>) {
    return `export:${payload.organizationId}:${payload.kind}:${payload.exportId}`
  }

  async execute() {
    await this.dedupService.markRunning(this.payload.dedupKey)

    logger.info(
      { exportId: this.payload.exportId, kind: this.payload.kind },
      'Export job placeholder executed'
    )

    await this.dedupService.markCompleted(this.payload.dedupKey)
  }

  async failed(error: Error) {
    await this.dedupService.markFailed(this.payload.dedupKey, error)
  }
}
