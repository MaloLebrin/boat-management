import { BoatBatterySchema } from '#database/schema'
import Boat from '#models/boat'
import type { BatteryChemistry } from '#shared/constants/tanks'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Batterie d'un bateau (#1037). `nominalVoltage` et `lowVoltageV` sont des
 * `decimal` : PostgreSQL les rend en chaîne (comme `threshold` des règles
 * d'alerte), le transformer les convertit en nombre.
 */
export default class BoatBattery extends BoatBatterySchema {
  declare chemistry: BatteryChemistry | null

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>
}
