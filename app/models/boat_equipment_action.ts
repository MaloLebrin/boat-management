import { BoatEquipmentActionSchema } from '#database/schema'
import Boat from '#models/boat'
import User from '#models/user'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BoatEquipmentAction extends BoatEquipmentActionSchema {
  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>
}
