import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import type { MediaEntityType, MediaKind } from '#shared/constants/media'
import User from '#models/user'

export default class Media extends BaseModel {
  static table = 'media'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare entityType: MediaEntityType

  @column()
  declare entityId: number

  @column()
  declare kind: MediaKind

  @column()
  declare cloudinaryPublicId: string

  @column()
  declare secureUrl: string

  @column()
  declare originalFilename: string

  @column()
  declare format: string

  @column()
  declare bytes: number

  @column()
  declare width: number | null

  @column()
  declare height: number | null

  @column()
  declare position: number

  @column()
  declare caption: string | null

  @column()
  declare uploadedById: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'uploadedById' })
  declare uploadedBy: BelongsTo<typeof User>
}
