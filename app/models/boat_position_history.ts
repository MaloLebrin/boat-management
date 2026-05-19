import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Boat from '#models/boat'
import Mouillage from '#models/mouillage'
import Pontoon from '#models/pontoon'

export default class BoatPositionHistory extends BaseModel {
  static table = 'boat_position_history'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare boatId: number

  @column()
  declare pontoonId: number | null

  @column()
  declare mouillageId: number | null

  @column()
  declare spotIdentifier: string | null

  @column.dateTime()
  declare startedAt: DateTime

  @column.dateTime()
  declare endedAt: DateTime | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => Pontoon)
  declare pontoon: BelongsTo<typeof Pontoon>

  @belongsTo(() => Mouillage)
  declare mouillage: BelongsTo<typeof Mouillage>
}
