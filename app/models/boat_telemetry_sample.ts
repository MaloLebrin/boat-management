import { BoatTelemetrySampleSchema } from '#database/schema'
import Boat from '#models/boat'
import BoatInstrumentSource from '#models/boat_instrument_source'
import type { JsonValue } from '#shared/types/notification'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Échantillon de télémétrie (#988), append-only. `value` porte les mesures
 * numériques (SI, `numeric(14,4)` → chaîne côté Lucid), `valueJson` les
 * valeurs structurées (position, alarmes). L'écriture en masse passe par
 * `TelemetryIngestService` (`ON CONFLICT DO NOTHING`), pas par le modèle.
 */
export default class BoatTelemetrySample extends BoatTelemetrySampleSchema {
  @column({
    // `pg` sérialise un objet en JSON mais convertit un **tableau** en tableau
    // Postgres : on sérialise nous-mêmes, comme `SimulatorShare`.
    prepare: (value: JsonValue | null) => (value === null ? null : JSON.stringify(value)),
    consume: (value: unknown) =>
      typeof value === 'string' ? (JSON.parse(value) as JsonValue) : (value as JsonValue | null),
  })
  declare valueJson: JsonValue | null

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => BoatInstrumentSource, { foreignKey: 'sourceId' })
  declare source: BelongsTo<typeof BoatInstrumentSource>
}
