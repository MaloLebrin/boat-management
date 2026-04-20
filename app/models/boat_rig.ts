import { BoatRigSchema } from '#database/schema'
import Boat from '#models/boat'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BoatRig extends BoatRigSchema {
  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>
}
