import Organization from '#models/organization'
import Boat from '#models/boat'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class BoatPricing extends BaseModel {
  static table = 'boat_pricing'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number

  @column()
  declare boatId: number

  @column()
  declare baseDailyPrice: string

  @column()
  declare baseWeeklyPrice: string | null

  @column()
  declare depositAmount: string | null

  @column()
  declare minDays: number | null

  @column()
  declare maxDays: number | null

  @column()
  declare currency: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>
}
