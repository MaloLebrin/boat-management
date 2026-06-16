import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'

export default class AiTokenUsage extends BaseModel {
  static table = 'ai_token_usages'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number

  @column()
  declare month: string

  @column()
  declare tokensUsed: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
