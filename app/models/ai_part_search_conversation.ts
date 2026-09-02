import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { AiChatMessage } from '#shared/types/ai'
import type {
  PartSearchContext,
  PartSearchPhase,
  PartSearchResult,
  PartSearchStatus,
} from '#shared/types/spare_part_chat'

/**
 * Conversation du chat IA de recherche de références de pièces (#634).
 *
 * FK nullables en `SET NULL` : la ligne survit à la suppression du compte, du
 * moteur ou du modèle du catalogue — elle porte le suivi des coûts
 * (`tokensUsed`). La propriété d'une conversation se prouve par le couple
 * (`userId`, `boatEngineId`), le moteur étant déjà scopé organisation.
 */
export default class AiPartSearchConversation extends BaseModel {
  static table = 'ai_part_search_conversations'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare token: string

  @column()
  declare userId: number | null

  @column()
  declare organizationId: number | null

  @column()
  declare boatEngineId: number | null

  @column()
  declare identifiedEngineModelId: number | null

  @column()
  declare locale: string

  @column()
  declare status: PartSearchStatus

  @column()
  declare phase: PartSearchPhase

  @column({
    prepare: (v: PartSearchContext | null) => (v === null ? null : JSON.stringify(v)),
    consume: (v: string | PartSearchContext | null) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare context: PartSearchContext | null

  @column({
    prepare: (v: AiChatMessage[]) => JSON.stringify(v),
    consume: (v: string | AiChatMessage[]) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare messages: AiChatMessage[]

  @column({
    prepare: (v: PartSearchResult | null) => (v === null ? null : JSON.stringify(v)),
    consume: (v: string | PartSearchResult | null) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare result: PartSearchResult | null

  @column()
  declare tokensUsed: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
