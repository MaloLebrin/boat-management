import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto'
import { inject } from '@adonisjs/core'
import limiter from '@adonisjs/limiter/services/main'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type Boat from '#models/boat'
import InstrumentPairing from '#models/instrument_pairing'
import type User from '#models/user'
import InstrumentIngestTokenService from '#services/instrument_ingest_token_service'
import InstrumentSourceService from '#services/instrument_source_service'
import env from '#start/env'
import {
  InstrumentPairingAlreadyUsedError,
  InstrumentPairingCodeInvalidError,
  InstrumentPairingRateLimitedError,
} from '#exceptions/instrument_pairing_errors'
import { InstrumentSourceNotFoundError } from '#exceptions/instrument_errors'
import {
  INSTRUMENT_PAIRING_ATTEMPT_LIMIT,
  INSTRUMENT_PAIRING_DELIVERY_GRACE_SECONDS,
  INSTRUMENT_PAIRING_DEVICE_CODE_BYTES,
  INSTRUMENT_PAIRING_DEVICE_CODE_MAX_LENGTH,
  INSTRUMENT_PAIRING_DEVICE_CODE_PREFIX,
  INSTRUMENT_PAIRING_POLL_INTERVAL_SECONDS,
  INSTRUMENT_PAIRING_TTL_SECONDS,
  INSTRUMENT_PAIRING_USER_CODE_ALPHABET,
  INSTRUMENT_PAIRING_USER_CODE_LENGTH,
  INSTRUMENT_SETUP_PLUGIN_PLACEHOLDER_URL,
} from '#shared/constants/instruments'
import {
  formatInstrumentPairingUserCode,
  normalizeInstrumentPairingUserCode,
} from '#shared/helpers/instruments'
import type {
  CreateInstrumentPairingPayload,
  InstrumentPairingCreated,
  InstrumentPairingPollResult,
} from '#shared/types/instruments'

const UNIQUE_VIOLATION = '23505'
const CREATE_ATTEMPTS = 3

/**
 * Appairage par code d'un boîtier Signal K (#1032, D11) — flux « device » façon
 * RFC 8628.
 *
 * - le boîtier crée l'appairage sans compte (`create`) et reçoit un `deviceCode`
 *   secret et un `userCode` court ; seules leurs **empreintes** sont stockées ;
 * - un admin saisit le `userCode` (`attach`) : l'appairage est rattaché au
 *   bateau, la source créée au besoin ;
 * - le boîtier interroge (`poll`) : à la première interrogation qui suit le
 *   rattachement, le jeton d'ingestion est **généré à cet instant** et rendu une
 *   seule fois. Il n'est donc jamais stocké, même chiffré : la base ne connaît
 *   que son sha256 (`ingest_token_hash`), comme pour un jeton généré à la main.
 */
@inject()
export default class InstrumentPairingService {
  constructor(
    private tokens: InstrumentIngestTokenService,
    private sourceService: InstrumentSourceService
  ) {}

  /** sha256 : le `deviceCode` a 256 bits d'entropie, un hachage rapide suffit. */
  hashDeviceCode(deviceCode: string): string {
    return createHash('sha256').update(deviceCode).digest('hex')
  }

  /**
   * HMAC clé `APP_KEY` : le `userCode` n'a que ~40 bits ; un sha256 nu se
   * retrouverait par force brute si la table fuitait. Entrée normalisée.
   */
  hashUserCode(normalizedUserCode: string): string {
    return createHmac('sha256', env.get('APP_KEY').release())
      .update(`instrument-pairing-user-code|${normalizedUserCode}`)
      .digest('hex')
  }

  /** `ABCD-EFGH`, tiré sans biais dans l'alphabet sans caractères ambigus. */
  generateUserCode(): string {
    let code = ''
    for (let i = 0; i < INSTRUMENT_PAIRING_USER_CODE_LENGTH; i++) {
      code += INSTRUMENT_PAIRING_USER_CODE_ALPHABET.charAt(
        randomInt(INSTRUMENT_PAIRING_USER_CODE_ALPHABET.length)
      )
    }
    return formatInstrumentPairingUserCode(code)
  }

  generateDeviceCode(): string {
    return (
      INSTRUMENT_PAIRING_DEVICE_CODE_PREFIX +
      randomBytes(INSTRUMENT_PAIRING_DEVICE_CODE_BYTES).toString('base64url')
    )
  }

  async create(payload: CreateInstrumentPairingPayload): Promise<InstrumentPairingCreated> {
    for (let attempt = 1; ; attempt++) {
      const deviceCode = this.generateDeviceCode()
      const userCode = this.generateUserCode()
      try {
        await InstrumentPairing.create({
          deviceCodeHash: this.hashDeviceCode(deviceCode),
          userCodeHash: this.hashUserCode(userCode.replace('-', '')),
          deviceLabel: payload.deviceLabel ?? null,
          hardwareKind: payload.hardwareKind ?? null,
          pluginVersion: payload.pluginVersion ?? null,
          expiresAt: DateTime.now().plus({ seconds: INSTRUMENT_PAIRING_TTL_SECONDS }),
        })
        return {
          deviceCode,
          userCode,
          expiresIn: INSTRUMENT_PAIRING_TTL_SECONDS,
          interval: INSTRUMENT_PAIRING_POLL_INTERVAL_SECONDS,
        }
      } catch (error) {
        // Collision de `userCode` (≈ 10⁻¹² par paire) : on retire un autre code.
        if (!isUniqueViolation(error) || attempt >= CREATE_ATTEMPTS) throw error
      }
    }
  }

  /**
   * Rattache l'appairage au bateau. Les essais **ratés** sont comptés par
   * utilisateur (`INSTRUMENT_PAIRING_ATTEMPT_LIMIT`) ; plafond atteint, plus
   * aucun code n'est vérifié. Code inconnu, mal formé ou expiré : la même
   * `InstrumentPairingCodeInvalidError`.
   */
  async attach(
    boat: Pick<Boat, 'id' | 'organizationId'>,
    user: Pick<User, 'id'>,
    rawUserCode: string
  ): Promise<InstrumentPairing> {
    const [blocked, pairing] = await limiter
      .use(INSTRUMENT_PAIRING_ATTEMPT_LIMIT)
      .penalize(`instrument_pairing_user_${user.id}`, () => this.claim(boat, user, rawUserCode))
    if (blocked !== null) throw new InstrumentPairingRateLimitedError(blocked.response.availableIn)
    return pairing
  }

  private async claim(
    boat: Pick<Boat, 'id' | 'organizationId'>,
    user: Pick<User, 'id'>,
    rawUserCode: string
  ): Promise<InstrumentPairing> {
    const userCode = normalizeInstrumentPairingUserCode(rawUserCode)
    if (userCode === null) throw new InstrumentPairingCodeInvalidError()

    return db.transaction(async (trx) => {
      const pairing = await InstrumentPairing.query({ client: trx })
        .where('userCodeHash', this.hashUserCode(userCode))
        .forUpdate()
        .first()
      const now = DateTime.now()
      if (!pairing || pairing.expiresAt <= now) throw new InstrumentPairingCodeInvalidError()
      if (pairing.approvedAt !== null) throw new InstrumentPairingAlreadyUsedError()

      if (!(await this.sourceService.findForBoat(boat))) {
        await this.sourceService.upsertForBoat(boat, {
          baseUrl: INSTRUMENT_SETUP_PLUGIN_PLACEHOLDER_URL,
        })
      }

      const deliverBy = now.plus({ seconds: INSTRUMENT_PAIRING_DELIVERY_GRACE_SECONDS })
      pairing.boatId = boat.id
      pairing.organizationId = boat.organizationId
      pairing.claimedByUserId = user.id
      pairing.approvedAt = now
      if (pairing.expiresAt < deliverBy) pairing.expiresAt = deliverBy
      await pairing.useTransaction(trx).save()
      return pairing
    })
  }

  /**
   * Réponse à l'interrogation du boîtier. Inconnu, expiré ou déjà livré :
   * `expired` (le boîtier recommence). `approved` n'est rendu **qu'une fois** :
   * la ligne est verrouillée le temps de générer le jeton et de poser
   * `consumed_at`, donc deux interrogations simultanées ne livrent qu'un jeton.
   */
  async poll(deviceCode: string): Promise<InstrumentPairingPollResult> {
    if (
      deviceCode.length > INSTRUMENT_PAIRING_DEVICE_CODE_MAX_LENGTH ||
      !deviceCode.startsWith(INSTRUMENT_PAIRING_DEVICE_CODE_PREFIX)
    ) {
      return { status: 'expired' }
    }

    return db.transaction(async (trx): Promise<InstrumentPairingPollResult> => {
      const pairing = await InstrumentPairing.query({ client: trx })
        .where('deviceCodeHash', this.hashDeviceCode(deviceCode))
        .forUpdate()
        .first()
      const now = DateTime.now()
      if (!pairing || pairing.consumedAt !== null || pairing.expiresAt <= now) {
        return { status: 'expired' }
      }
      if (pairing.approvedAt === null || pairing.boatId === null) {
        return { status: 'pending', interval: INSTRUMENT_PAIRING_POLL_INTERVAL_SECONDS }
      }

      let token: string
      try {
        token = await this.tokens.issueForBoat({ id: pairing.boatId })
      } catch (error) {
        // Source supprimée entre le rattachement et la livraison.
        if (error instanceof InstrumentSourceNotFoundError) return { status: 'expired' }
        throw error
      }
      pairing.consumedAt = now
      await pairing.useTransaction(trx).save()
      return { status: 'approved', token }
    })
  }

  /** Supprime les appairages expirés (livrés ou non) ; rend leur nombre. */
  async purgeExpired(now: DateTime = DateTime.now()): Promise<number> {
    const result = await db.rawQuery('delete from instrument_pairings where expires_at < ?', [
      now.toUTC().toISO()!,
    ])
    return result.rowCount ?? 0
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === UNIQUE_VIOLATION
  )
}
