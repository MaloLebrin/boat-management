import { BoatInspectionSignatureSchema } from '#database/schema'
import BoatInspection from '#models/boat_inspection'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/** Tracé manuscrit d'une partie à l'état des lieux (#889). */
export default class BoatInspectionSignature extends BoatInspectionSignatureSchema {
  static table = 'boat_inspection_signatures'

  @belongsTo(() => BoatInspection, { foreignKey: 'boatInspectionId' })
  declare inspection: BelongsTo<typeof BoatInspection>
}
