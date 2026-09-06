import { OrganizationAiKeySchema } from '#database/schema'
import Organization from '#models/organization'
import type { AiProvider } from '#shared/types/ai'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Clé API IA d'une organisation pour un fournisseur (BYOK multi-fournisseurs).
 * Une ligne par couple org/fournisseur (contrainte unique en base) — un nouvel
 * enregistrement remplace la clé existante (`updateOrCreate`).
 */
export default class OrganizationAiKey extends OrganizationAiKeySchema {
  declare provider: AiProvider

  // Chiffrée au repos (APP_KEY), jamais sérialisée : seuls les booléens
  // `configuredProviders` construits dans OrganizationAiKeyService sortent
  // du backend.
  @column({ serializeAs: null })
  declare apiKeyEncrypted: string

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
