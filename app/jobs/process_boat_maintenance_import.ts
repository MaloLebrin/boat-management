import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import QueueDedupService from '#services/queue_dedup_service'

export interface ProcessBoatMaintenanceImportPayload {
  organizationId: number
  boatId: number
  requestedByUserId: number
  importId: string
  dedupKey: string
}

export default class ProcessBoatMaintenanceImport extends Job<ProcessBoatMaintenanceImportPayload> {
  static options: JobOptions = {
    queue: 'maintenance',
    maxRetries: 5,
  }

  static dedupKey(payload: Omit<ProcessBoatMaintenanceImportPayload, 'dedupKey'>) {
    return `maintenance_import:${payload.organizationId}:${payload.boatId}:${payload.importId}`
  }

  async execute() {
    const dedup = new QueueDedupService()
    await dedup.markRunning(this.payload.dedupKey)

    // Intentionally minimal: the domain implementation will live in a dedicated
    // service once the import format/storage is defined.
    logger.info(
      { importId: this.payload.importId, boatId: this.payload.boatId },
      'Maintenance import job placeholder executed'
    )

    await dedup.markCompleted(this.payload.dedupKey)
  }

  async failed(error: Error) {
    const dedup = new QueueDedupService()
    await dedup.markFailed(this.payload.dedupKey, error)
  }
}
