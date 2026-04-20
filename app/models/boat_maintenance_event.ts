import { BoatMaintenanceEventSchema } from '#database/schema'
import Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import BoatMaintenancePart from '#models/boat_maintenance_part'
import BoatRig from '#models/boat_rig'
import BoatSail from '#models/boat_sail'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class BoatMaintenanceEvent extends BoatMaintenanceEventSchema {
  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => BoatEngine, { foreignKey: 'boatEngineId' })
  declare engine: BelongsTo<typeof BoatEngine>

  @belongsTo(() => BoatSail, { foreignKey: 'boatSailId' })
  declare sail: BelongsTo<typeof BoatSail>

  @belongsTo(() => BoatRig, { foreignKey: 'boatRigId' })
  declare rig: BelongsTo<typeof BoatRig>

  @hasMany(() => BoatMaintenancePart, { foreignKey: 'maintenanceEventId' })
  declare parts: HasMany<typeof BoatMaintenancePart>
}
