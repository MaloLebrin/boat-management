import Organization from '#models/organization'
import Boat from '#models/boat'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class PricingSeason extends BaseModel {
  static table = 'pricing_seasons'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number

  @column()
  declare boatId: number | null

  @column()
  declare name: string

  @column.date()
  declare startsOn: DateTime

  @column.date()
  declare endsOn: DateTime

  @column()
  declare dailyPrice: string | null

  @column()
  declare multiplier: string | null

  @column()
  declare priority: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>
}
