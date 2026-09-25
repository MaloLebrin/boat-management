import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Rechiffre les secrets stockés au repos (clés API BYOK) avec la clé courante
 * d'`ENCRYPTION_KEY` (#786). À lancer après avoir déployé une nouvelle
 * `ENCRYPTION_KEY` (l'ancienne en `ENCRYPTION_KEY_PREVIOUS`), et une fois pour
 * la migration initiale depuis `APP_KEY`. Idempotent : relançable sans effet
 * de bord. Sort en code 1 si une valeur n'est déchiffrable par aucune clé —
 * procédure complète dans docs/dev/encryption-keys.md.
 */
export default class EncryptionRotate extends BaseCommand {
  static commandName = 'encryption:rotate'
  static description =
    'Rechiffre les clés API BYOK avec la clé courante ENCRYPTION_KEY (rotation ou migration depuis APP_KEY)'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Compte ce qui serait rechiffré sans rien écrire' })
  declare dryRun: boolean

  async run() {
    const { default: OrganizationAiKeyService } =
      await import('#services/organization_ai_key_service')
    const service = await this.app.container.make(OrganizationAiKeyService)

    const report = await service.reencryptAll({ dryRun: this.dryRun })
    const verb = report.dryRun ? 'à rechiffrer' : 'rechiffrée(s)'

    this.logger.info(
      `${report.total} clé(s) BYOK parcourue(s)${report.dryRun ? ' (dry-run)' : ''}.`
    )
    this.logger.success(
      `${report.reencrypted} clé(s) ${verb} avec la clé courante, dont ${report.fromAppKey} encore chiffrée(s) avec APP_KEY.`
    )

    if (report.undecryptable > 0) {
      this.logger.error(
        `${report.undecryptable} clé(s) indéchiffrable(s) par ENCRYPTION_KEY, ENCRYPTION_KEY_PREVIOUS et APP_KEY — laissée(s) telles quelles, voir les journaux (organizationId, provider). Les organisations concernées doivent ressaisir leur clé.`
      )
      this.exitCode = 1
      return
    }

    if (!report.dryRun) {
      this.logger.info(
        'Toutes les clés sont chiffrées avec la clé courante : ENCRYPTION_KEY_PREVIOUS peut être retirée.'
      )
    }
  }
}
