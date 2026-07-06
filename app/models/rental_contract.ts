import { RentalContractSchema } from '#database/schema'
import BoatReservation from '#models/boat_reservation'
import Client from '#models/client'
import Media from '#models/media'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { RentalContractStatus } from '#shared/types/rental_contract'

export default class RentalContract extends RentalContractSchema {
  declare status: RentalContractStatus

  @belongsTo(() => BoatReservation, { foreignKey: 'reservationId' })
  declare reservation: BelongsTo<typeof BoatReservation>

  @belongsTo(() => Client)
  declare client: BelongsTo<typeof Client>

  @belongsTo(() => Media, { foreignKey: 'mediaId' })
  declare media: BelongsTo<typeof Media>
}
