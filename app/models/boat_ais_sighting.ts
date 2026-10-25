import { BoatAisSightingSchema } from '#database/schema'
import Boat from '#models/boat'
import BoatInstrumentSource from '#models/boat_instrument_source'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Cible AIS relevée (#1009), append-only et à rétention courte. L'écriture en
 * masse passe par `AisTargetService` (`ON CONFLICT DO NOTHING`), pas par le
 * modèle.
 */
export default class BoatAisSighting extends BoatAisSightingSchema {
  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => BoatInstrumentSource, { foreignKey: 'sourceId' })
  declare source: BelongsTo<typeof BoatInstrumentSource>
}
