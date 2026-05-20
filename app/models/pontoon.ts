import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Port from '#models/port'
import Spot from '#models/spot'

export default class Pontoon extends BaseModel {
  static table = 'pontoons'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare portId: number

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare positionX: number | null

  @column()
  declare positionY: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Port)
  declare port: BelongsTo<typeof Port>

  @hasMany(() => Spot)
  declare spots: HasMany<typeof Spot>
}
