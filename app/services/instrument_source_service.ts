import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import type Boat from '#models/boat'
import BoatInstrumentSource from '#models/boat_instrument_source'
import DataEncryptionService from '#services/data_encryption_service'
import { InvalidInstrumentBaseUrlError } from '#exceptions/instrument_errors'
import { INSTRUMENT_DEFAULT_VESSEL_CONTEXT } from '#shared/constants/instruments'
import { normalizeInstrumentBaseUrl } from '#shared/helpers/instruments'
import {
  toInstrumentSourceConnection,
  toInstrumentSourceRow,
} from '#transformers/instrument_transformer'
import type {
  InstrumentSourceConnection,
  InstrumentSourceKind,
  InstrumentSourceRow,
  UpsertInstrumentSourcePayload,
} from '#shared/types/instruments'

const KIND: InstrumentSourceKind = 'signalk'

/**
 * Source Signal K d'un bateau (#988) : une par bateau. Le jeton est chiffré
 * à l'écriture (`DataEncryptionService`) et ne ressort que par
 * `toConnection(source, { revealToken: true })`.
 */
@inject()
export default class InstrumentSourceService {
  constructor(private encryption: DataEncryptionService) {}

  /** La source du bateau, active ou non. */
  async findForBoat(boat: Pick<Boat, 'id'>): Promise<BoatInstrumentSource | null> {
    return BoatInstrumentSource.query().where('boatId', boat.id).where('kind', KIND).first()
  }

  async findEnabledForBoat(boat: Pick<Boat, 'id'>): Promise<BoatInstrumentSource | null> {
    const source = await this.findForBoat(boat)
    return source?.enabled ? source : null
  }

  /**
   * Crée ou met à jour la source. `token` absent conserve le jeton en base,
   * `null` ou vide l'efface, une chaîne le remplace (chiffrée). Ré-enregistrer
   * efface `lastError` : l'admin vient de corriger quelque chose.
   */
  async upsertForBoat(
    boat: Pick<Boat, 'id' | 'organizationId'>,
    payload: UpsertInstrumentSourcePayload
  ): Promise<BoatInstrumentSource> {
    const baseUrl = normalizeInstrumentBaseUrl(payload.baseUrl)
    if (baseUrl === null) throw new InvalidInstrumentBaseUrlError()

    const source =
      (await this.findForBoat(boat)) ??
      new BoatInstrumentSource().fill({
        boatId: boat.id,
        organizationId: boat.organizationId,
        kind: KIND,
      })

    source.baseUrl = baseUrl
    source.vesselContext = payload.vesselContext?.trim() || INSTRUMENT_DEFAULT_VESSEL_CONTEXT
    source.enabled = payload.enabled ?? true
    source.lastError = null

    if (payload.token !== undefined) {
      const token = payload.token?.trim() ?? ''
      source.tokenEncrypted = token.length > 0 ? this.encryption.encrypt(token) : null
    }

    await source.save()
    return source
  }

  /** Supprime la source ; ses échantillons suivent (`ON DELETE CASCADE`). */
  async destroy(boat: Pick<Boat, 'id'>): Promise<boolean> {
    const source = await this.findForBoat(boat)
    if (!source) return false
    await source.delete()
    return true
  }

  toRow(source: BoatInstrumentSource): InstrumentSourceRow {
    return toInstrumentSourceRow(source)
  }

  /**
   * La source avec son jeton en clair si `revealToken` (visiteur qui peut
   * ingérer, D3). Un jeton qu'aucune clé ne déchiffre (rotation incomplète)
   * est rendu `null` et journalisé — comme les clés BYOK (#786).
   */
  toConnection(
    source: BoatInstrumentSource,
    options: { revealToken: boolean }
  ): InstrumentSourceConnection {
    let token: string | null = null
    if (options.revealToken && source.tokenEncrypted !== null) {
      const decrypted = this.encryption.decrypt(source.tokenEncrypted)
      if (decrypted) {
        token = decrypted.plainText
      } else {
        logger.warn(
          { sourceId: source.id, boatId: source.boatId },
          'Instrument source token cannot be decrypted with any known key'
        )
      }
    }
    return toInstrumentSourceConnection(source, token)
  }

  /** Dernier lot reçu : date posée par l'ingestion, erreur effacée. */
  async touchLastSeen(source: BoatInstrumentSource, at: DateTime = DateTime.now()): Promise<void> {
    source.lastSeenAt = at
    source.lastError = null
    await source.save()
  }
}
