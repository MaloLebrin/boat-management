import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { AiChatMessage } from '#shared/types/ai'
import type {
  PublicDiagnosisContext,
  PublicDiagnosisResult,
  PublicDiagnosisStatus,
} from '#shared/types/public_diagnosis'

/**
 * Conversation du chat IA public de diagnostic de panne (#602).
 *
 * `userId`/`organizationId` nullables : conversation anonyme (propriété par
 * session, cf. `PUBLIC_DIAGNOSIS_SESSION_KEY`). Les lignes survivent à la
 * suppression du compte (FK SET NULL) pour le suivi des coûts `tokensUsed`.
 */
export default class AiDiagnosisConversation extends BaseModel {
  static table = 'ai_diagnosis_conversations'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare token: string

  @column()
  declare userId: number | null

  @column()
  declare organizationId: number | null

  @column()
  declare locale: string

  @column()
  declare status: PublicDiagnosisStatus

  @column({
    prepare: (v: PublicDiagnosisContext | null) => (v === null ? null : JSON.stringify(v)),
    consume: (v: string | PublicDiagnosisContext | null) =>
      typeof v === 'string' ? JSON.parse(v) : v,
  })
  declare context: PublicDiagnosisContext | null

  @column({
    prepare: (v: AiChatMessage[]) => JSON.stringify(v),
    consume: (v: string | AiChatMessage[]) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare messages: AiChatMessage[]

  @column({
    prepare: (v: PublicDiagnosisResult | null) => (v === null ? null : JSON.stringify(v)),
    consume: (v: string | PublicDiagnosisResult | null) =>
      typeof v === 'string' ? JSON.parse(v) : v,
  })
  declare result: PublicDiagnosisResult | null

  @column()
  declare tokensUsed: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
