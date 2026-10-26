import type BoatInstrumentAlert from '#models/boat_instrument_alert'
import type BoatInstrumentAlertRule from '#models/boat_instrument_alert_rule'
import type BoatInstrumentSource from '#models/boat_instrument_source'
import type InstrumentPairing from '#models/instrument_pairing'
import type { JsonValue } from '#shared/types/notification'
import type {
  InstrumentAlertRow,
  InstrumentAlertRuleRow,
  InstrumentPairingRow,
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
    hasIngestToken: source.ingestTokenHash !== null,
    ingestTokenIssuedAt: source.ingestTokenIssuedAt?.toISO() ?? null,
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
  return { source: null, latest: [], recent: {}, rules: [], openAlerts: [], aisTargets: [], can }
}

export function toAlertRuleRow(rule: BoatInstrumentAlertRule): InstrumentAlertRuleRow {
  return {
    id: rule.id,
    path: rule.path,
    operator: rule.operator,
    threshold: Number(rule.threshold),
    hysteresis: Number(rule.hysteresis),
    severity: rule.severity,
    enabled: rule.enabled,
  }
}

export function toAlertRow(alert: BoatInstrumentAlert): InstrumentAlertRow {
  return {
    id: alert.id,
    ruleKey: alert.ruleKey,
    path: alert.path,
    severity: alert.severity,
    openedAt: alert.openedAt.toISO()!,
    clearedAt: alert.clearedAt?.toISO() ?? null,
    lastValue: alert.lastValue === null ? null : Number(alert.lastValue),
    message: alert.message,
  }
}

export function toInstrumentPairingRow(pairing: InstrumentPairing): InstrumentPairingRow {
  return {
    id: pairing.id,
    deviceLabel: pairing.deviceLabel,
    hardwareKind: pairing.hardwareKind,
    pluginVersion: pairing.pluginVersion,
  }
}
