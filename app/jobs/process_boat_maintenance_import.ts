import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import QueueDedupService from '#services/queue_dedup_service'
import { inject } from '@adonisjs/core'

export interface ProcessBoatMaintenanceImportPayload {
  organizationId: number
  boatId: number
  requestedByUserId: number
  importId: string
  dedupKey: string
}

@inject()
export default class ProcessBoatMaintenanceImport extends Job<ProcessBoatMaintenanceImportPayload> {
  static options: JobOptions = {
    queue: 'maintenance',
    maxRetries: 5,
  }

  constructor(private dedupService: QueueDedupService) {
    super()
  }

  static dedupKey(payload: Omit<ProcessBoatMaintenanceImportPayload, 'dedupKey'>) {
    return `maintenance_import:${payload.organizationId}:${payload.boatId}:${payload.importId}`
  }

  async execute() {
    await this.dedupService.markRunning(this.payload.dedupKey)

    logger.info(
      { importId: this.payload.importId, boatId: this.payload.boatId },
      'Maintenance import job placeholder executed'
    )

    await this.dedupService.markCompleted(this.payload.dedupKey)
  }

  async failed(error: Error) {
    await this.dedupService.markFailed(this.payload.dedupKey, error)
  }
}
