import { BoatInstrumentSourceSchema } from '#database/schema'
import Boat from '#models/boat'
import BoatTelemetrySample from '#models/boat_telemetry_sample'
import Organization from '#models/organization'
import type { InstrumentSourceKind } from '#shared/types/instruments'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

/**
 * Serveur Signal K d'un bateau (#988). Une ligne par bateau et par `kind`
 * (contrainte unique) ; `baseUrl` est une origine validée par
 * `normalizeInstrumentBaseUrl` — c'est la valeur réinjectée dans la CSP.
 */
export default class BoatInstrumentSource extends BoatInstrumentSourceSchema {
  declare kind: InstrumentSourceKind

  // Jeton Signal K chiffré au repos via DataEncryptionService (ENCRYPTION_KEY,
  // #786), jamais sérialisé : seul `InstrumentSourceService.toConnection`
  // le déchiffre, dans la prop différée `instruments` (D3).
  @column({ serializeAs: null })
  declare tokenEncrypted: string | null

  // sha256 du jeton d'ingestion du plugin (#994) : jamais sérialisé, le jeton
  // lui-même n'est montré qu'une fois, à sa génération.
  @column({ serializeAs: null })
  declare ingestTokenHash: string | null

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => BoatTelemetrySample, { foreignKey: 'sourceId' })
  declare samples: HasMany<typeof BoatTelemetrySample>
}
