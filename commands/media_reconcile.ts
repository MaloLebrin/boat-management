import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Lance à la main la réconciliation des médias (#859), celle que le job
 * `ReconcileMedia` fait chaque semaine. `--dry-run` décrit l'écart sans rien
 * supprimer ni corriger.
 */
export default class MediaReconcile extends BaseCommand {
  static commandName = 'media:reconcile'
  static description =
    'Supprime les médias orphelins et recalcule le stockage utilisé par organisation'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Audit seul : rien n’est supprimé ni corrigé' })
  declare dryRun: boolean

  async run() {
    const { default: MediaReconciliationService } =
      await import('#services/media_reconciliation_service')
    const service = await this.app.container.make(MediaReconciliationService)
    const dryRun = this.dryRun === true

    const { orphans, storage } = await service.reconcile({ dryRun })

    const mode = dryRun ? '[dry-run] ' : ''
    this.logger.info(
      `${mode}Médias orphelins : ${orphans.found} trouvé(s), ${orphans.deleted} supprimé(s), ${orphans.failed} en échec, ${orphans.bytes} octet(s).`
    )
    for (const [entityType, count] of Object.entries(orphans.byEntityType)) {
      this.logger.info(`${mode}  - ${entityType} : ${count}`)
    }
    if (orphans.unknownEntityType > 0) {
      this.logger.warning(
        `${mode}${orphans.unknownEntityType} média(s) avec un entity_type inconnu, laissé(s) tel(s) quel(s).`
      )
    }

    this.logger.info(
      `${mode}Stockage : ${storage.drifts.length} organisation(s) en écart, ${storage.corrected} corrigée(s), ${storage.skipped} ignorée(s).`
    )
    for (const drift of storage.drifts) {
      this.logger.info(
        `${mode}  - organisation ${drift.organizationId} : ${drift.recordedBytes} → ${drift.actualBytes} octet(s)`
      )
    }
  }
}
