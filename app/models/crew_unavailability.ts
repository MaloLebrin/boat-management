import CrewMember from '#models/crew_member'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'

/** Indisponibilité d'un équipier (congés, autre embarquement…), jours inclus (#883). */
export default class CrewUnavailability extends BaseModel {
  static table = 'crew_unavailabilities'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare crewMemberId: number

  @column.date()
  declare startsOn: DateTime

  @column.date()
  declare endsOn: DateTime

  @column()
  declare reason: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => CrewMember)
  declare crewMember: BelongsTo<typeof CrewMember>
}
