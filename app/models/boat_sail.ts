import { BoatSailSchema } from '#database/schema'
import Boat from '#models/boat'
import SailLoft from '#models/sail_loft'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BoatSail extends BoatSailSchema {
  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  /**
   * Voilerie du référentiel (#578), rattachement facultatif : `sailmaker`
   * reste la source de vérité et le repli texte libre.
   */
  @belongsTo(() => SailLoft, { foreignKey: 'sailLoftId' })
  declare loft: BelongsTo<typeof SailLoft>
}
