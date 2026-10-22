import { createHash, randomBytes } from 'node:crypto'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import type Boat from '#models/boat'
import BoatInstrumentSource from '#models/boat_instrument_source'
import InstrumentSourceService from '#services/instrument_source_service'
import { InstrumentSourceNotFoundError } from '#exceptions/instrument_errors'
import {
  INSTRUMENT_INGEST_TOKEN_BYTES,
  INSTRUMENT_INGEST_TOKEN_MAX_LENGTH,
  INSTRUMENT_INGEST_TOKEN_PREFIX,
} from '#shared/constants/instruments'

const BEARER = /^Bearer\s+(\S+)$/i

/**
 * Jeton d'ingestion du plugin Signal K (#994, D1). Un jeton par source, tiré
 * au hasard (32 octets) et **affiché une fois** : seul son sha256 est stocké.
 * Générer un nouveau jeton remplace — donc révoque — l'ancien.
 */
@inject()
export default class InstrumentIngestTokenService {
  constructor(private sourceService: InstrumentSourceService) {}

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  /** Génère (ou fait tourner) le jeton de la source du bateau et le rend en clair, une seule fois. */
  async issueForBoat(boat: Pick<Boat, 'id'>): Promise<string> {
    const source = await this.sourceService.findForBoat(boat)
    if (!source) throw new InstrumentSourceNotFoundError()

    const token =
      INSTRUMENT_INGEST_TOKEN_PREFIX +
      randomBytes(INSTRUMENT_INGEST_TOKEN_BYTES).toString('base64url')
    source.ingestTokenHash = this.hash(token)
    source.ingestTokenIssuedAt = DateTime.now()
    await source.save()
    return token
  }

  /** Révoque le jeton : le plugin est refusé dès la requête suivante. Faux sans jeton. */
  async revokeForBoat(boat: Pick<Boat, 'id'>): Promise<boolean> {
    const source = await this.sourceService.findForBoat(boat)
    if (!source || source.ingestTokenHash === null) return false
    source.ingestTokenHash = null
    source.ingestTokenIssuedAt = null
    await source.save()
    return true
  }

  /** Le jeton d'un en-tête `Authorization: Bearer …`, ou `null` si absent ou de forme inattendue. */
  extractBearer(header: string | undefined): string | null {
    const token = header ? BEARER.exec(header.trim())?.[1] : undefined
    if (!token || token.length > INSTRUMENT_INGEST_TOKEN_MAX_LENGTH) return null
    return token.startsWith(INSTRUMENT_INGEST_TOKEN_PREFIX) ? token : null
  }

  /** La source dont le jeton correspond, ou `null`. La recherche porte sur le hash (index unique). */
  async findSourceByBearer(header: string | undefined): Promise<BoatInstrumentSource | null> {
    const token = this.extractBearer(header)
    if (token === null) return null
    return BoatInstrumentSource.query().where('ingestTokenHash', this.hash(token)).first()
  }
}
