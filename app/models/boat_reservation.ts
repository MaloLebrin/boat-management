import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Boat from '#models/boat'
import Organization from '#models/organization'
import type { ReservationStatus } from '#shared/types/reservation'

export default class BoatReservation extends BaseModel {
  static table = 'boat_reservations'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare boatId: number

  @column()
  declare organizationId: number

  @column()
  declare status: ReservationStatus

  @column.dateTime()
  declare startsAt: DateTime

  @column.dateTime()
  declare endsAt: DateTime

  @column()
  declare clientName: string

  @column()
  declare clientEmail: string | null

  @column()
  declare clientPhone: string | null

  @column()
  declare notes: string | null

  @column()
  declare totalPrice: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
