import { BoatSafetyEquipmentSchema } from '#database/schema'
import Boat from '#models/boat'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BoatSafetyEquipment extends BoatSafetyEquipmentSchema {
  static table = 'boat_safety_equipment'

  declare status: 'ok' | 'to_check' | 'expired'

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>
}
