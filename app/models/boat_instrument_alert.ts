import { BoatInstrumentAlertSchema } from '#database/schema'
import Boat from '#models/boat'
import BoatInstrumentAlertRule from '#models/boat_instrument_alert_rule'
import type { InstrumentAlertSeverity } from '#shared/types/instruments'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Alerte d'un bateau (#993) : ouverte tant que `clearedAt` est `null` — une
 * seule par `(boatId, ruleKey, path)` (index unique partiel). Une fois levée,
 * la ligne reste comme historique.
 */
export default class BoatInstrumentAlert extends BoatInstrumentAlertSchema {
  declare severity: InstrumentAlertSeverity

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => BoatInstrumentAlertRule, { foreignKey: 'ruleId' })
  declare rule: BelongsTo<typeof BoatInstrumentAlertRule>
}
