import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import Mouillage from '#models/mouillage'
import Pontoon from '#models/pontoon'

export default class Port extends BaseModel {
  static table = 'ports'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number

  @column()
  declare name: string

  @column()
  declare city: string | null

  @column()
  declare country: string | null

  @column()
  declare address: string | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => Pontoon)
  declare pontoons: HasMany<typeof Pontoon>

  @hasMany(() => Mouillage)
  declare mouillages: HasMany<typeof Mouillage>
}
