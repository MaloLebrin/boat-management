import { BoatMaintenanceTaskSchema } from '#database/schema'
import Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import BoatRig from '#models/boat_rig'
import BoatSail from '#models/boat_sail'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BoatMaintenanceTask extends BoatMaintenanceTaskSchema {
  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => BoatEngine, { foreignKey: 'boatEngineId' })
  declare engine: BelongsTo<typeof BoatEngine>

  @belongsTo(() => BoatSail, { foreignKey: 'boatSailId' })
  declare sail: BelongsTo<typeof BoatSail>

  @belongsTo(() => BoatRig, { foreignKey: 'boatRigId' })
  declare rig: BelongsTo<typeof BoatRig>
}
