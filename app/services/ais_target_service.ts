import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { TelemetryValueKindMismatchError } from '#exceptions/instrument_errors'
import type Boat from '#models/boat'
import { AIS_MAX_TARGETS, AIS_RECENT_WINDOW_MIN } from '#shared/constants/ais'
import { TELEMETRY_VALUE_ABS_MAX } from '#shared/constants/instruments'
import { parseAisPath, parseAisTargetValue } from '#shared/helpers/ais'
import type { AisSightingInsert, AisSightingRow, AisTarget } from '#shared/types/ais'
import type { TelemetrySampleInput } from '#shared/types/instruments'

/** Taille des `INSERT` multi-lignes : 100 × 14 colonnes reste loin de la limite de paramètres de `pg`. */
export const AIS_INSERT_CHUNK_SIZE = 100

const UNIQUE_COLUMNS = ['source_id', 'mmsi', 'recorded_at']

/** `numeric` revient en chaîne de `pg`. */
function num(value: string | number | null): number | null {
  return value === null ? null : Number(value)
}

/** Cibles AIS relevées par les instruments (#1009) : écriture du lot et relecture récente. */
export default class AisTargetService {
  /**
   * Traduit les échantillons `ais.<mmsi>` d'un lot en lignes SQL, sans toucher
   * la base. Une valeur sans position valide ou hors plage refuse le lot
   * entier, comme pour toute autre valeur de télémétrie.
   */
  prepare(
    source: { id: number; boatId: number },
    samples: TelemetrySampleInput[],
    recordedAtOf: (sample: TelemetrySampleInput) => string,
    createdAt: string
  ): AisSightingInsert[] {
    return samples.map((sample) => {
      const mmsi = parseAisPath(sample.path)
      const target = mmsi === null ? null : parseAisTargetValue(sample.valueJson)
      if (mmsi === null || target === null) {
        throw new TelemetryValueKindMismatchError(sample.path, 'json')
      }
      for (const value of [target.sogMs, target.cogRad, target.cpaM, target.tcpaS]) {
        if (value !== null && Math.abs(value) > TELEMETRY_VALUE_ABS_MAX) {
          throw new TelemetryValueKindMismatchError(sample.path, 'json')
        }
      }
      return {
        boat_id: source.boatId,
        source_id: source.id,
        mmsi,
        recorded_at: recordedAtOf(sample),
        name: target.name,
        latitude: target.latitude,
        longitude: target.longitude,
        sog_ms: target.sogMs,
        cog_rad: target.cogRad,
        ship_type: target.shipType,
        ship_type_name: target.shipTypeName,
        cpa_m: target.cpaM,
        tcpa_s: target.tcpaS,
        created_at: createdAt,
      }
    })
  }

  /** Insère par tranches ; rend le nombre de lignes réellement écrites (les rejeux sont ignorés). */
  async insert(rows: AisSightingInsert[]): Promise<number> {
    let accepted = 0
    for (let index = 0; index < rows.length; index += AIS_INSERT_CHUNK_SIZE) {
      const inserted = await db
        .table('boat_ais_sightings')
        .multiInsert(rows.slice(index, index + AIS_INSERT_CHUNK_SIZE))
        .onConflict(UNIQUE_COLUMNS)
        .ignore()
        .returning('id')
      accepted += inserted.length
    }
    return accepted
  }

  /**
   * Dernier relevé de chaque cible vue dans les `windowMin` dernières
   * minutes, les plus récentes d'abord — de quoi remplir la fiche quand le
   * flux n'est pas ouvert. La distance au bateau se calcule à l'affichage.
   */
  async recentForBoat(
    boat: Pick<Boat, 'id'>,
    windowMin: number = AIS_RECENT_WINDOW_MIN,
    now: DateTime = DateTime.now()
  ): Promise<AisTarget[]> {
    const since = now.minus({ minutes: windowMin }).toUTC().toISO()!
    const result = await db.rawQuery<{ rows: AisSightingRow[] }>(
      `select mmsi, recorded_at, name, latitude, longitude, sog_ms, cog_rad, ship_type,
              ship_type_name, cpa_m, tcpa_s
       from (
         select distinct on (mmsi) mmsi, recorded_at, name, latitude, longitude, sog_ms,
                cog_rad, ship_type, ship_type_name, cpa_m, tcpa_s
         from boat_ais_sightings
         where boat_id = ? and recorded_at >= ?
         order by mmsi, recorded_at desc
       ) latest
       order by recorded_at desc
       limit ?`,
      [boat.id, since, AIS_MAX_TARGETS]
    )
    return result.rows.map((row) => ({
      mmsi: row.mmsi,
      seenAt: (row.recorded_at instanceof Date
        ? row.recorded_at
        : new Date(row.recorded_at)
      ).toISOString(),
      name: row.name,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      sogMs: num(row.sog_ms),
      cogRad: num(row.cog_rad),
      shipType: row.ship_type,
      shipTypeName: row.ship_type_name,
      cpaM: num(row.cpa_m),
      tcpaS: num(row.tcpa_s),
      distanceM: null,
    }))
  }
}
