import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type Boat from '#models/boat'
import type BoatInstrumentSource from '#models/boat_instrument_source'
import InstrumentSourceService from '#services/instrument_source_service'
import { TELEMETRY_RECENT_WINDOW_MIN } from '#shared/constants/instruments'
import {
  toIso,
  toTelemetryLatestValue,
  type TelemetryLatestRow,
} from '#transformers/instrument_transformer'
import type {
  InstrumentsTabCapabilities,
  InstrumentsTabProps,
  TelemetryLatestValue,
  TelemetryRecentPoint,
} from '#shared/types/instruments'

interface RecentRow {
  path: string
  recorded_at: Date | string
  value: string | number
}

/**
 * Lectures de télémétrie pour la fiche bateau (#988). L'historique long et
 * les séries agrégées (`date_bin`) arrivent en PR 5.
 */
@inject()
export default class TelemetryReadService {
  constructor(private sourceService: InstrumentSourceService) {}

  /** Dernière valeur de chaque chemin — `DISTINCT ON (path)` sur l'index `(boat_id, path, recorded_at desc)`. */
  async latestForBoat(boat: Pick<Boat, 'id'>): Promise<TelemetryLatestValue[]> {
    const result = await db.rawQuery<{ rows: TelemetryLatestRow[] }>(
      `select distinct on (path) path, recorded_at, value, value_json
       from boat_telemetry_samples
       where boat_id = ?
       order by path, recorded_at desc`,
      [boat.id]
    )
    return result.rows.map(toTelemetryLatestValue)
  }

  /** Dernière valeur de chacun des `paths` donnés — la même requête, bornée aux chemins utiles. */
  async latestForPaths(
    boat: Pick<Boat, 'id'>,
    paths: readonly string[]
  ): Promise<Map<string, TelemetryLatestValue>> {
    if (paths.length === 0) return new Map()
    const result = await db.rawQuery<{ rows: TelemetryLatestRow[] }>(
      `select distinct on (path) path, recorded_at, value, value_json
       from boat_telemetry_samples
       where boat_id = ? and path = any(?)
       order by path, recorded_at desc`,
      [boat.id, [...paths]]
    )
    return new Map(
      result.rows.map((row) => {
        const latest = toTelemetryLatestValue(row)
        return [latest.path, latest] as const
      })
    )
  }

  /**
   * Points numériques des `windowMin` dernières minutes, par chemin, du plus
   * ancien au plus récent. Les valeurs structurées (`value_json`) n'y sont
   * pas : une position ou une alarme ne se trace pas en courbe.
   */
  async recentForBoat(
    boat: Pick<Boat, 'id'>,
    windowMin: number = TELEMETRY_RECENT_WINDOW_MIN,
    now: DateTime = DateTime.now()
  ): Promise<Record<string, TelemetryRecentPoint[]>> {
    const since = now.minus({ minutes: windowMin }).toUTC().toISO()!
    const result = await db.rawQuery<{ rows: RecentRow[] }>(
      `select path, recorded_at, value
       from boat_telemetry_samples
       where boat_id = ? and recorded_at >= ? and value is not null
       order by path, recorded_at`,
      [boat.id, since]
    )

    const recent: Record<string, TelemetryRecentPoint[]> = {}
    for (const row of result.rows) {
      ;(recent[row.path] ??= []).push([toIso(row.recorded_at), Number(row.value)])
    }
    return recent
  }

  /**
   * La prop différée `instruments` (jamais `null`, #478). Le jeton n'est
   * révélé qu'à qui peut ingérer (D3). `source` est passée par l'appelant :
   * `BoatsController.show()` l'a déjà chargée pour la CSP.
   */
  async tabProps(
    boat: Pick<Boat, 'id'>,
    source: BoatInstrumentSource | null,
    can: InstrumentsTabCapabilities
  ): Promise<InstrumentsTabProps> {
    const [latest, recent] = await Promise.all([this.latestForBoat(boat), this.recentForBoat(boat)])
    return {
      source: source ? this.sourceService.toConnection(source, { revealToken: can.ingest }) : null,
      latest,
      recent,
      can,
    }
  }
}
