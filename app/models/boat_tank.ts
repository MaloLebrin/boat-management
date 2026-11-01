import { BoatTankSchema } from '#database/schema'
import Boat from '#models/boat'
import type { TankType } from '#shared/constants/tanks'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/** Réservoir d'un bateau (#1037) : `type` ∈ catalogue `tanks.<type>`, `instrumentKey` = `<type>.<id>`. */
export default class BoatTank extends BoatTankSchema {
  declare type: TankType

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>
}
