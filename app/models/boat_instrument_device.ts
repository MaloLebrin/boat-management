import { BoatInstrumentDeviceSchema } from '#database/schema'
import BoatInstrumentSource from '#models/boat_instrument_source'
import type { InstrumentDeviceBus } from '#shared/types/instruments'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Appareil du bus annoncé par la boîte (#1036). `deviceId` est l'empreinte
 * posée par le plugin, unique par source. `serialNumber` est la valeur que le
 * plugin choisit de partager (déjà hachée ou omise s'il masque les séries) : conservée
 * pour départager deux appareils identiques (#1037, rattachement), jamais
 * sérialisée vers le navigateur ni journalisée.
 */
export default class BoatInstrumentDevice extends BoatInstrumentDeviceSchema {
  declare bus: InstrumentDeviceBus

  @column({ serializeAs: null })
  declare serialNumber: string | null

  @column({
    prepare: (value: string[]) => JSON.stringify(value),
    consume: (value: string[] | string) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare paths: string[]

  @belongsTo(() => BoatInstrumentSource, { foreignKey: 'sourceId' })
  declare source: BelongsTo<typeof BoatInstrumentSource>
}
