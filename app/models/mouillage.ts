import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Port from '#models/port'

export default class Mouillage extends BaseModel {
  static table = 'mouillages'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare portId: number

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Port)
  declare port: BelongsTo<typeof Port>
}
