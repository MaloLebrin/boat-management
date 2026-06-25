import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Boat from '#models/boat'

export default class BoatBudgetEntry extends BaseModel {
  static table = 'boat_budget_entries'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare boatId: number

  @column()
  declare amount: string

  @column.date()
  declare date: DateTime

  @column()
  declare label: string

  @column()
  declare category: string

  @column()
  declare description: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>
}
