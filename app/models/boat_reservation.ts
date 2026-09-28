import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Boat from '#models/boat'
import Organization from '#models/organization'
import type {
  ReservationPaymentMethod,
  ReservationPaymentStatus,
  ReservationStatus,
  ReservationType,
  SecurityDepositStatus,
} from '#shared/types/reservation'

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

  // Type de prestation (#585) — nullable : les réservations antérieures n'en
  // portent aucun et restent affichées telles quelles.
  @column()
  declare type: ReservationType | null

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

  // Paiement (#875) : acompte attendu, encaissé, statut et moyen du dernier
  // encaissement. DECIMAL → chaînes, comme `totalPrice`.
  @column()
  declare depositAmount: string | null

  @column.dateTime()
  declare depositPaidAt: DateTime | null

  @column.dateTime()
  declare balancePaidAt: DateTime | null

  @column()
  declare paidAmount: string

  @column()
  declare paymentStatus: ReservationPaymentStatus

  @column()
  declare paymentMethod: ReservationPaymentMethod | null

  // Caution (#875) : copiée du tarif du bateau à la confirmation.
  @column()
  declare securityDepositAmount: string | null

  @column()
  declare securityDepositStatus: SecurityDepositStatus

  @column()
  declare securityDepositRetainedAmount: string | null

  @column()
  declare securityDepositNote: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
