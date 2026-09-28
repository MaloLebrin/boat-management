import Boat from '#models/boat'
import User from '#models/user'
import type { BoatStatus } from '#shared/types/boat_status'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

/** Historique des changements de statut d'un bateau (#870). */
export default class BoatStatusChange extends BaseModel {
  static table = 'boat_status_changes'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare boatId: number

  @column()
  declare organizationId: number

  @column()
  declare fromStatus: BoatStatus

  @column()
  declare toStatus: BoatStatus

  @column()
  declare reason: string | null

  @column()
  declare userId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
