import { BoatEngineSchema } from '#database/schema'
import Boat from '#models/boat'
import BoatEnginePart from '#models/boat_engine_part'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class BoatEngine extends BoatEngineSchema {
  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @hasMany(() => BoatEnginePart, { foreignKey: 'boatEngineId' })
  declare parts: HasMany<typeof BoatEnginePart>
}
