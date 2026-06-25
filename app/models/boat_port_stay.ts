import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Boat from '#models/boat'

export default class BoatPortStay extends BaseModel {
  static table = 'boat_port_stays'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare boatId: number

  @column()
  declare portName: string

  @column.date()
  declare startedAt: DateTime

  @column.date()
  declare endedAt: DateTime | null

  @column()
  declare cost: string | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>
}
