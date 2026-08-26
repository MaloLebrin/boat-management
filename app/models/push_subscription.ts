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

  @column()
  declare endpoint: string

  @column()
  declare endpointHash: string

  // Le naming Lucid découperait `p256dh` en `p_256_dh`
  @column({ columnName: 'p256dh' })
  declare p256dh: string

  @column()
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
