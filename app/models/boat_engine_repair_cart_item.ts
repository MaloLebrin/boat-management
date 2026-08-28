import { BoatEngineRepairCartItemSchema } from '#database/schema'
import BoatEngine from '#models/boat_engine'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BoatEngineRepairCartItem extends BoatEngineRepairCartItemSchema {
  static table = 'boat_engine_repair_cart_items'

  @belongsTo(() => BoatEngine, { foreignKey: 'boatEngineId' })
  declare engine: BelongsTo<typeof BoatEngine>
}
