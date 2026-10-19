import type BoatInstrumentSource from '#models/boat_instrument_source'
import type { JsonValue } from '#shared/types/notification'
import type {
  InstrumentSourceConnection,
  InstrumentSourceRow,
  InstrumentsTabCapabilities,
  InstrumentsTabProps,
  TelemetryLatestValue,
} from '#shared/types/instruments'

export function toInstrumentSourceRow(source: BoatInstrumentSource): InstrumentSourceRow {
  return {
    id: source.id,
    boatId: source.boatId,
    kind: source.kind,
    baseUrl: source.baseUrl,
    vesselContext: source.vesselContext,
    enabled: source.enabled,
    hasToken: source.tokenEncrypted !== null,
    lastSeenAt: source.lastSeenAt?.toISO() ?? null,
    lastError: source.lastError,
  }
}

/** La ligne plus le jeton déjà déchiffré par le service (ou `null`). */
export function toInstrumentSourceConnection(
  source: BoatInstrumentSource,
  token: string | null
): InstrumentSourceConnection {
  return { ...toInstrumentSourceRow(source), token }
}

/** Ligne brute d'une lecture `DISTINCT ON (path)` sur `boat_telemetry_samples`. */
export interface TelemetryLatestRow {
  path: string
  recorded_at: Date | string
  value: string | number | null
  value_json: JsonValue | null
}

/** `numeric` revient en chaîne de `pg` : on le rend en nombre. */
export function toTelemetryLatestValue(row: TelemetryLatestRow): TelemetryLatestValue {
  return {
    path: row.path,
    recordedAt: toIso(row.recorded_at),
    value: row.value === null ? null : Number(row.value),
    valueJson: row.value_json ?? null,
  }
}

export function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

/** La prop différée sans source ni donnée — jamais `null` (#478). */
export function emptyInstrumentsTabProps(can: InstrumentsTabCapabilities): InstrumentsTabProps {
  return { source: null, latest: [], recent: {}, can }
}
