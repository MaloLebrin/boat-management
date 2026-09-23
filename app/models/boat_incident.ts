import { BoatIncidentSchema } from '#database/schema'
import Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import BoatEnginePart from '#models/boat_engine_part'
import BoatGenericEquipment from '#models/boat_generic_equipment'
import BoatRig from '#models/boat_rig'
import BoatSafetyEquipment from '#models/boat_safety_equipment'
import BoatSail from '#models/boat_sail'
import User from '#models/user'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BoatIncident extends BoatIncidentSchema {
  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  /** Qui a déclaré l'incident (#816) — `null` pour les lignes antérieures ou un compte supprimé. */
  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>

  // Cible de l'incident (#813) — au plus une des six posée, `SET NULL` si
  // l'équipement disparaît : l'incident reste, il vise alors le bateau entier.
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

  @belongsTo(() => BoatEnginePart, { foreignKey: 'boatEnginePartId' })
  declare enginePart: BelongsTo<typeof BoatEnginePart>
}
