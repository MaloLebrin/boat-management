import { BoatFuelLogSchema } from '#database/schema'
import Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BoatFuelLog extends BoatFuelLogSchema {
  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => BoatEngine, { foreignKey: 'boatEngineId' })
  declare engine: BelongsTo<typeof BoatEngine>
}
