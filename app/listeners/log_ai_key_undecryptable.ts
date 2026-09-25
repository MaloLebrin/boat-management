import type AiKeyUndecryptable from '#events/ai_key_undecryptable'
import logger from '@adonisjs/core/services/logger'

/**
 * Journalise en `error`, avec un champ `event` stable pour être compté par
 * l'agrégateur de logs (#786). Ids seulement : ni la valeur chiffrée, ni
 * a fortiori une clé.
 */
export default class LogAiKeyUndecryptable {
  async handle(event: AiKeyUndecryptable) {
    logger.error(
      {
        event: 'ai_key_undecryptable',
        organizationId: event.organization.id,
        provider: event.provider,
      },
      'OrganizationAiKeyService: clé BYOK indéchiffrable, repli sur la clé Mistral de l’app et son quota — la clé doit être ressaisie ou la rotation terminée (docs/dev/encryption-keys.md)'
    )
  }
}
