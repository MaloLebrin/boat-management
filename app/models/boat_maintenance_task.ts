import { BoatMaintenanceTaskSchema } from '#database/schema'
import Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import BoatGenericEquipment from '#models/boat_generic_equipment'
import BoatRig from '#models/boat_rig'
import BoatSafetyEquipment from '#models/boat_safety_equipment'
import BoatSail from '#models/boat_sail'
import User from '#models/user'
import { assignOrganizationFromBoat } from '#models/assign_organization_from_boat'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BoatMaintenanceTask extends BoatMaintenanceTaskSchema {
  @beforeCreate()
  static async fillOrganizationId(row: BoatMaintenanceTask) {
    await assignOrganizationFromBoat(row)
  }

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => BoatEngine, { foreignKey: 'boatEngineId' })
  declare engine: BelongsTo<typeof BoatEngine>

  @belongsTo(() => BoatSail, { foreignKey: 'boatSailId' })
  declare sail: BelongsTo<typeof BoatSail>

  @belongsTo(() => BoatRig, { foreignKey: 'boatRigId' })
  declare rig: BelongsTo<typeof BoatRig>

  @belongsTo(() => BoatSafetyEquipment, { foreignKey: 'boatSafetyEquipmentId' })
  declare safetyEquipment: BelongsTo<typeof BoatSafetyEquipment>

  @belongsTo(() => BoatGenericEquipment, { foreignKey: 'boatGenericEquipmentId' })
  declare genericEquipment: BelongsTo<typeof BoatGenericEquipment>

  /** Membre à qui la tâche est confiée (#868), `null` si personne. */
  @belongsTo(() => User, { foreignKey: 'assigneeId' })
  declare assignee: BelongsTo<typeof User>
}
