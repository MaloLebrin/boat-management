import { BoatInspectionItemSchema } from '#database/schema'
import BoatInspection from '#models/boat_inspection'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BoatInspectionItem extends BoatInspectionItemSchema {
  static table = 'boat_inspection_items'

  @belongsTo(() => BoatInspection, { foreignKey: 'boatInspectionId' })
  declare inspection: BelongsTo<typeof BoatInspection>
}
