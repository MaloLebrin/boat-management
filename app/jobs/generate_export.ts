import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

export interface GenerateExportPayload {
  organizationId: number
  requestedByUserId: number
  exportId: string
  kind: 'csv' | 'pdf'
}

export default class GenerateExport extends Job<GenerateExportPayload> {
  static options: JobOptions = {
    queue: 'exports',
    maxRetries: 3,
  }

  async execute() {
    logger.info(
      { exportId: this.payload.exportId, kind: this.payload.kind },
      'Export job placeholder executed'
    )
  }
}
