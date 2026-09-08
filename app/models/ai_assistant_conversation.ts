import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type {
  AssistantMessage,
  AssistantPendingAction,
  AssistantStatus,
  AssistantTaskProposal,
} from '#shared/types/assistant'

/**
 * Conversation du copilote FleetAi (panneau global de l'app).
 *
 * FK nullables en `SET NULL` : la ligne survit à la suppression du compte —
 * elle porte le suivi des coûts (`tokensUsed`). La propriété se prouve par
 * `userId` (une conversation est personnelle, pas partagée dans l'org).
 *
 * `pendingAction` est la source de vérité de l'endpoint de confirmation :
 * proposition validée côté serveur, jamais un payload client.
 */
export default class AiAssistantConversation extends BaseModel {
  static table = 'ai_assistant_conversations'

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
  declare status: AssistantStatus

  @column({
    prepare: (v: AssistantMessage[]) => JSON.stringify(v),
    consume: (v: string | AssistantMessage[]) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare messages: AssistantMessage[]

  @column({
    prepare: (v: AssistantPendingAction | null) => (v === null ? null : JSON.stringify(v)),
    // Les blobs antérieurs à l'agent actionnable n'ont pas de champ `kind` :
    // ils sont des propositions de tâche — enveloppés à la lecture, sans
    // migration (une action en attente bloque le fil, il y en a très peu).
    consume: (v: string | AssistantPendingAction | null): AssistantPendingAction | null => {
      const parsed = typeof v === 'string' ? (JSON.parse(v) as AssistantPendingAction | null) : v
      if (parsed === null) return null
      if ('kind' in parsed) return parsed
      return { ...(parsed as AssistantTaskProposal), kind: 'create_task' }
    },
  })
  declare pendingAction: AssistantPendingAction | null

  @column()
  declare tokensUsed: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
