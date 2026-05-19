import { BoatSchema } from '#database/schema'
import Organization from '#models/organization'
import BoatEngine from '#models/boat_engine'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import BoatPositionHistory from '#models/boat_position_history'
import BoatRig from '#models/boat_rig'
import BoatSail from '#models/boat_sail'
import BoatSafetyEquipment from '#models/boat_safety_equipment'
import Mouillage from '#models/mouillage'
import Pontoon from '#models/pontoon'
import { belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'

export default class Boat extends BoatSchema {
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => BoatEngine)
  declare engines: HasMany<typeof BoatEngine>

  @hasMany(() => BoatSail)
  declare sails: HasMany<typeof BoatSail>

  @hasOne(() => BoatRig)
  declare rig: HasOne<typeof BoatRig>

  @hasMany(() => BoatMaintenanceEvent)
  declare maintenanceEvents: HasMany<typeof BoatMaintenanceEvent>

  @hasMany(() => BoatSafetyEquipment)
  declare safetyEquipment: HasMany<typeof BoatSafetyEquipment>

  @belongsTo(() => Pontoon)
  declare pontoon: BelongsTo<typeof Pontoon>

  @belongsTo(() => Mouillage)
  declare mouillage: BelongsTo<typeof Mouillage>

  @hasMany(() => BoatPositionHistory)
  declare positionHistory: HasMany<typeof BoatPositionHistory>
}
