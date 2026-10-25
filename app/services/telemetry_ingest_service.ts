import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type BoatInstrumentSource from '#models/boat_instrument_source'
import AisTargetService from '#services/ais_target_service'
import InstrumentSourceService from '#services/instrument_source_service'
import TelemetryIngested from '#events/telemetry_ingested'
import {
  InstrumentSourceDisabledError,
  InstrumentSourceNotFoundError,
  TelemetryBatchTooLargeError,
  TelemetryPathNotAllowedError,
  TelemetryRecordedAtInvalidError,
  TelemetryValueKindMismatchError,
  TelemetryValueOutOfRangeError,
} from '#exceptions/instrument_errors'
import {
  TELEMETRY_FUTURE_TOLERANCE_MIN,
  TELEMETRY_MAX_BATCH_SIZE,
  TELEMETRY_VALUE_ABS_MAX,
  telemetryPathSpec,
} from '#shared/constants/instruments'
import { isAisPathFamily, parseAisPath } from '#shared/helpers/ais'
import type { AisSightingInsert } from '#shared/types/ais'
import type {
  TelemetryBatchPayload,
  TelemetrySampleInput,
  TelemetryIngestMeta,
  TelemetryIngestResult,
} from '#shared/types/instruments'

/** Une ligne prête pour `boat_telemetry_samples`, en colonnes SQL. */
export interface TelemetrySampleRow {
  boat_id: number
  source_id: number
  path: string
  recorded_at: string
  value: number | null
  /** JSON déjà sérialisé — `pg` convertirait un tableau JS en tableau Postgres. */
  value_json: string | null
  created_at: string
}

/** Ce que `prepare` lit d'une source : assez pour l'unité sans base. */
export type TelemetrySourceLike = Pick<BoatInstrumentSource, 'id' | 'boatId' | 'enabled'>

/** Taille des `INSERT` multi-lignes : 100 × 7 colonnes reste loin de la limite de paramètres de `pg`. */
export const TELEMETRY_INSERT_CHUNK_SIZE = 100

const UNIQUE_COLUMNS = ['source_id', 'path', 'recorded_at']

/**
 * Entrée unique de l'ingestion (#988, D1) : le contrôleur Inertia de la PWA
 * et, plus tard, le contrôleur `/api` du plugin Signal K (PR 7) passent tous
 * deux par `ingest()`. Les effets métier écoutent `TelemetryIngested`.
 *
 * Idempotence (D4) : la contrainte unique `(source_id, path, recorded_at)`
 * et `ON CONFLICT DO NOTHING` font qu'un lot rejoué (drain interrompu, 5xx
 * après écriture) n'insère rien de plus — `ignored` le compte.
 */
@inject()
export default class TelemetryIngestService {
  constructor(
    private sourceService: InstrumentSourceService,
    private aisTargetService: AisTargetService
  ) {}

  /**
   * Vérifie un lot et le traduit en lignes SQL, sans toucher la base. Lève à
   * la première anomalie : un lot est accepté ou refusé **en entier**, ce qui
   * donne au client un `rejectedType` net plutôt qu'un succès partiel muet.
   */
  prepare(
    source: TelemetrySourceLike,
    batch: TelemetryBatchPayload,
    now: DateTime = DateTime.now()
  ): TelemetrySampleRow[] {
    if (batch.sourceId !== source.id) throw new InstrumentSourceNotFoundError()
    if (!source.enabled) throw new InstrumentSourceDisabledError()
    if (batch.samples.length > TELEMETRY_MAX_BATCH_SIZE) {
      throw new TelemetryBatchTooLargeError(batch.samples.length, TELEMETRY_MAX_BATCH_SIZE)
    }

    const futureLimit = now.plus({ minutes: TELEMETRY_FUTURE_TOLERANCE_MIN })
    const createdAt = now.toISO()!

    return batch.samples.map((sample) => {
      const spec = telemetryPathSpec(sample.path)
      if (!spec) throw new TelemetryPathNotAllowedError(sample.path)

      const recordedAt = this.parseRecordedAt(sample.recordedAt, futureLimit)

      let value: number | null = null
      let valueJson: string | null = null
      if (spec.valueKind === 'number') {
        if (typeof sample.value !== 'number') {
          throw new TelemetryValueKindMismatchError(sample.path, 'number')
        }
        if (!Number.isFinite(sample.value) || Math.abs(sample.value) > TELEMETRY_VALUE_ABS_MAX) {
          throw new TelemetryValueOutOfRangeError(sample.path, sample.value)
        }
        value = sample.value
      } else {
        if (sample.valueJson === undefined || sample.valueJson === null) {
          throw new TelemetryValueKindMismatchError(sample.path, 'json')
        }
        valueJson = JSON.stringify(sample.valueJson)
      }

      return {
        boat_id: source.boatId,
        source_id: source.id,
        path: sample.path,
        recorded_at: recordedAt,
        value,
        value_json: valueJson,
        created_at: createdAt,
      }
    })
  }

  /** `recordedAt` lisible et pas plus loin dans le futur que la tolérance (D9) ; rend l'instant en UTC. */
  private parseRecordedAt(raw: string, futureLimit: DateTime): string {
    const recordedAt = DateTime.fromISO(raw, { setZone: true })
    if (!recordedAt.isValid) throw new TelemetryRecordedAtInvalidError(raw, 'unparsable')
    if (recordedAt > futureLimit) throw new TelemetryRecordedAtInvalidError(raw, 'future')
    return recordedAt.toUTC().toISO()!
  }

  /**
   * Sépare les cibles AIS (`ais.<mmsi>`, #1009) des mesures du bateau : elles
   * ont leur table et leur rétention. Un chemin `ais.*` qui n'est pas un MMSI
   * reste du côté des mesures et y est refusé par la liste blanche.
   */
  partition(samples: TelemetrySampleInput[]): {
    measures: TelemetrySampleInput[]
    ais: TelemetrySampleInput[]
  } {
    const measures: TelemetrySampleInput[] = []
    const ais: TelemetrySampleInput[] = []
    for (const sample of samples) {
      if (isAisPathFamily(sample.path) && parseAisPath(sample.path) !== null) ais.push(sample)
      else measures.push(sample)
    }
    return { measures, ais }
  }

  /** Les cibles AIS d'un lot en lignes SQL, avec les mêmes contrôles de date que les mesures. */
  prepareAis(
    source: TelemetrySourceLike,
    samples: TelemetrySampleInput[],
    now: DateTime = DateTime.now()
  ): AisSightingInsert[] {
    const futureLimit = now.plus({ minutes: TELEMETRY_FUTURE_TOLERANCE_MIN })
    const normalized = new Map<TelemetrySampleInput, string>(
      samples.map((sample) => [sample, this.parseRecordedAt(sample.recordedAt, futureLimit)])
    )
    return this.aisTargetService.prepare(
      source,
      samples,
      (sample) => normalized.get(sample)!,
      now.toISO()!
    )
  }

  /** Découpe en `INSERT` de taille bornée, dans l'ordre du lot. */
  chunk<T>(rows: T[], size: number = TELEMETRY_INSERT_CHUNK_SIZE): T[][] {
    const chunks: T[][] = []
    for (let index = 0; index < rows.length; index += size) {
      chunks.push(rows.slice(index, index + size))
    }
    return chunks
  }

  async ingest(
    source: BoatInstrumentSource,
    batch: TelemetryBatchPayload,
    meta: TelemetryIngestMeta
  ): Promise<TelemetryIngestResult> {
    // Un lot est accepté ou refusé en entier : tout est vérifié avant la première écriture.
    if (batch.samples.length > TELEMETRY_MAX_BATCH_SIZE) {
      throw new TelemetryBatchTooLargeError(batch.samples.length, TELEMETRY_MAX_BATCH_SIZE)
    }
    const { measures, ais } = this.partition(batch.samples)
    const rows = this.prepare(source, { ...batch, samples: measures })
    const aisRows = this.prepareAis(source, ais)

    let accepted = 0
    for (const chunk of this.chunk(rows)) {
      // `RETURNING id` ne rend que les lignes réellement insérées : c'est le
      // compte des acceptées, les doublons étant ignorés par la contrainte.
      const inserted = await db
        .table('boat_telemetry_samples')
        .multiInsert(chunk)
        .onConflict(UNIQUE_COLUMNS)
        .ignore()
        .returning('id')
      accepted += inserted.length
    }

    const aisAccepted = await this.aisTargetService.insert(aisRows)
    const result: TelemetryIngestResult = {
      accepted: accepted + aisAccepted,
      ignored: rows.length - accepted + (aisRows.length - aisAccepted),
    }
    await this.sourceService.touchLastSeen(source)

    const paths = [...new Set(rows.map((row) => row.path))]
    logger.info(
      {
        boatId: source.boatId,
        sourceId: source.id,
        batchId: batch.batchId,
        ...result,
        origin: meta.origin,
      },
      'Telemetry batch ingested'
    )
    await TelemetryIngested.dispatch(source, result, paths, meta.origin, batch.batchId)

    return result
  }
}
