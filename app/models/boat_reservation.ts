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

  // Optional link to a CRM client (#275). The free-text client fields below are
  // kept as a denormalized snapshot so the reservation stays readable even if the
  // client is later unlinked or deleted (FK is SET NULL).
  @column()
  declare clientId: number | null

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

  // pg driver returns DECIMAL columns as strings; kept as string to preserve precision
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
