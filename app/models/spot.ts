import { BaseModel, belongsTo, column, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Boat from '#models/boat'
import Mouillage from '#models/mouillage'
import Organization from '#models/organization'
import Pontoon from '#models/pontoon'

export default class Spot extends BaseModel {
  static table = 'spots'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare pontoonId: number | null

  @column()
  declare mouillageId: number | null

  @column()
  declare organizationId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Pontoon)
  declare pontoon: BelongsTo<typeof Pontoon>

  @belongsTo(() => Mouillage)
  declare mouillage: BelongsTo<typeof Mouillage>

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @hasOne(() => Boat)
  declare boat: HasOne<typeof Boat>
}
