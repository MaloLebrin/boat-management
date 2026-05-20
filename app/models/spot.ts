import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
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

  @hasMany(() => Boat)
  declare boats: HasMany<typeof Boat>
}
