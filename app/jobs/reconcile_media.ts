import MediaReconciliationService from '#services/media_reconciliation_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

/**
 * Passe hebdomadaire de réconciliation des médias (#859) : orphelins supprimés,
 * compteurs de stockage recalculés. Idempotente — un échec Cloudinary laisse la
 * ligne en place pour la passe suivante.
 */
@inject()
export default class ReconcileMedia extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'media',
    maxRetries: 2,
  }

  constructor(private reconciliationService: MediaReconciliationService) {
    super()
  }

  async execute() {
    logger.info('ReconcileMedia: starting reconciliation run')
    const report = await this.reconciliationService.reconcile({ dryRun: false })
    logger.info(
      {
        orphans: report.orphans,
        storageDrifts: report.storage.drifts.length,
        storageCorrected: report.storage.corrected,
        storageSkipped: report.storage.skipped,
      },
      'ReconcileMedia: reconciliation complete'
    )
  }

  async failed(error: Error) {
    logger.error({ error }, 'ReconcileMedia: job failed')
  }
}
