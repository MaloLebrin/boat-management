import { InstrumentPairingSchema } from '#database/schema'
import Boat from '#models/boat'
import Organization from '#models/organization'
import User from '#models/user'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Appairage par code d'un boîtier Signal K (#1032). `boatId`, `organizationId`
 * et `claimedByUserId` sont nuls tant qu'un admin n'a pas saisi le code. Les
 * deux empreintes ne sont jamais sérialisées.
 */
export default class InstrumentPairing extends InstrumentPairingSchema {
  @column({ serializeAs: null })
  declare deviceCodeHash: string

  @column({ serializeAs: null })
  declare userCodeHash: string

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => User, { foreignKey: 'claimedByUserId' })
  declare claimedBy: BelongsTo<typeof User>
}
