import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

export interface ProcessBoatMaintenanceImportPayload {
  organizationId: number
  boatId: number
  requestedByUserId: number
  importId: string
}

export default class ProcessBoatMaintenanceImport extends Job<ProcessBoatMaintenanceImportPayload> {
  static options: JobOptions = {
    queue: 'maintenance',
    maxRetries: 5,
  }

  async execute() {
    // Intentionally minimal: the domain implementation will live in a dedicated
    // service once the import format/storage is defined.
    logger.info(
      { importId: this.payload.importId, boatId: this.payload.boatId },
      'Maintenance import job placeholder executed'
    )
  }
}
