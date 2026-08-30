import { BoatGenericEquipmentSchema } from '#database/schema'
import Boat from '#models/boat'
import EquipmentModel from '#models/equipment_model'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BoatGenericEquipment extends BoatGenericEquipmentSchema {
  static table = 'boat_generic_equipment'

  declare status: 'ok' | 'to_check' | 'to_replace'

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  /**
   * Modèle du catalogue (#577), nullable : `brand` et `model` restent le repli
   * texte libre et un équipement hors catalogue est parfaitement valide.
   */
  @belongsTo(() => EquipmentModel, { foreignKey: 'equipmentModelId' })
  declare catalogModel: BelongsTo<typeof EquipmentModel>
}
