import { BoatInspectionSchema } from '#database/schema'
import BoatReservation from '#models/boat_reservation'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BoatInspection extends BoatInspectionSchema {
  @belongsTo(() => BoatReservation, { foreignKey: 'reservationId' })
  declare reservation: BelongsTo<typeof BoatReservation>
}
