import BoatReservation from '#models/boat_reservation'
import CrewMember from '#models/crew_member'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import type { ReservationCrewRole } from '#shared/types/crew'

/** Affectation d'un équipier à une réservation (#883). */
export default class BoatReservationCrewMember extends BaseModel {
  static table = 'boat_reservation_crew_members'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'boat_reservation_id' })
  declare reservationId: number

  @column()
  declare crewMemberId: number

  @column()
  declare role: ReservationCrewRole

  @column()
  declare notes: string | null

  /** Rappel J-1 envoyé : le scan quotidien ne prévient qu'une fois. */
  @column.dateTime()
  declare reminderSentAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => BoatReservation, { foreignKey: 'reservationId' })
  declare reservation: BelongsTo<typeof BoatReservation>

  @belongsTo(() => CrewMember)
  declare crewMember: BelongsTo<typeof CrewMember>
}
