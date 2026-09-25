import type Organization from '#models/organization'
import type { AiProvider } from '#shared/types/ai'
import { BaseEvent } from '@adonisjs/core/events'

/**
 * Une clé API BYOK n'est déchiffrable par aucune clé connue (#786) : l'appel
 * IA retombe sur la clé Mistral de l'app et sur le quota — sans ce signal, un
 * incident de configuration se lit sur la facture. Émis par
 * `OrganizationAiKeyService.resolveActiveKey`.
 */
export default class AiKeyUndecryptable extends BaseEvent {
  constructor(
    public readonly organization: Organization,
    public readonly provider: AiProvider
  ) {
    super()
  }
}
