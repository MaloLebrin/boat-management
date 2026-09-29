import { BoatInspectionSchema } from '#database/schema'
import BoatReservation from '#models/boat_reservation'
import BoatInspectionSignature from '#models/boat_inspection_signature'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class BoatInspection extends BoatInspectionSchema {
  @belongsTo(() => BoatReservation, { foreignKey: 'reservationId' })
  declare reservation: BelongsTo<typeof BoatReservation>

  /** Signatures du client et de l'agent (#889) — présentes une fois l'inspection figée. */
  @hasMany(() => BoatInspectionSignature, { foreignKey: 'boatInspectionId' })
  declare signatures: HasMany<typeof BoatInspectionSignature>
}
