import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#models/organization'
import User from '#models/user'

export default class PushSubscription extends BaseModel {
  static table = 'push_subscriptions'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare organizationId: number

  /**
   * L'abonnement Web Push est une capacité : `endpoint` + `p256dh` + `auth`
   * suffisent à envoyer une notification dans le navigateur de l'utilisateur,
   * sans passer par l'app. Les quatre colonnes sont donc masquées à la
   * sérialisation (#782) — l'écran de réglages passe de toute façon par
   * `PushSubscriptionTransformer.toRow`, qui choisit ses champs.
   */
  @column({ serializeAs: null })
  declare endpoint: string

  @column({ serializeAs: null })
  declare endpointHash: string

  // Le naming Lucid découperait `p256dh` en `p_256_dh`
  @column({ columnName: 'p256dh', serializeAs: null })
  declare p256dh: string

  @column({ serializeAs: null })
  declare auth: string

  @column()
  declare userAgent: string | null

  @column()
  declare failureCount: number

  @column.dateTime()
  declare lastUsedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
