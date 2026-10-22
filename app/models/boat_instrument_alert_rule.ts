import { BoatInstrumentAlertRuleSchema } from '#database/schema'
import Boat from '#models/boat'
import type { InstrumentAlertOperator, InstrumentAlertSeverity } from '#shared/types/instruments'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Règle de seuil d'un bateau (#993). `threshold` et `hysteresis` sont des
 * `numeric(14,4)` en unités SI : Lucid les rend en chaîne, le transformer en nombre.
 */
export default class BoatInstrumentAlertRule extends BoatInstrumentAlertRuleSchema {
  declare operator: InstrumentAlertOperator
  declare severity: InstrumentAlertSeverity

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>
}
