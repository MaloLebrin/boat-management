import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import type BoatInstrumentSource from '#models/boat_instrument_source'
import NavigationLog from '#models/navigation_log'
import BoatPositionService from '#services/boat_position_service'
import NavigationLogEntryService from '#services/navigation_log_entry_service'
import TelemetryReadService from '#services/telemetry_read_service'
import { INSTRUMENT_LOG_ENTRY_INTERVAL_MIN } from '#shared/constants/instrument_sync'
import {
  kelvinToCelsius,
  metersPerSecondToKnots,
  radiansToDegrees,
} from '#shared/helpers/instruments'
import type { InstrumentPositionInput, TelemetryLatestValue } from '#shared/types/instruments'

const PATH_POSITION = 'navigation.position'
const PATH_SOG = 'navigation.speedOverGround'
const PATH_COG = 'navigation.courseOverGroundTrue'
const PATH_TWD = 'environment.wind.directionTrue'
const PATH_TWA = 'environment.wind.angleTrueWater'
const PATH_TWS = 'environment.wind.speedTrue'
const PATH_DEPTH = 'environment.depth.belowTransducer'
const PATH_WATER_TEMP = 'environment.water.temperature'

const SYNC_PATHS = [
  PATH_POSITION,
  PATH_SOG,
  PATH_COG,
  PATH_TWD,
  PATH_TWA,
  PATH_TWS,
  PATH_DEPTH,
  PATH_WATER_TEMP,
]

/** `{ latitude, longitude }` valide, ou `null` : une valeur structurée vient du client, rien n'est supposé. */
function readPosition(
  value: TelemetryLatestValue | undefined
): Pick<InstrumentPositionInput, 'latitude' | 'longitude'> | null {
  const json = value?.valueJson
  if (json === null || json === undefined || typeof json !== 'object' || Array.isArray(json)) {
    return null
  }
  const { latitude, longitude } = json as Record<string, unknown>
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90) return null
  if (!Number.isFinite(longitude) || Math.abs(longitude) > 180) return null
  return { latitude, longitude }
}

/**
 * Position et point de journal issus des instruments (#991). Le dernier fix de
 * la base fait foi — pas le contenu du lot : un lot rejoué ou reçu en retard
 * ne peut pas ramener le bateau en arrière.
 */
@inject()
export default class PositionSyncService {
  constructor(
    private readService: TelemetryReadService,
    private positionService: BoatPositionService,
    private entryService: NavigationLogEntryService
  ) {}

  async sync(
    source: Pick<BoatInstrumentSource, 'boatId'>,
    paths: readonly string[],
    now: DateTime = DateTime.now()
  ): Promise<{ positionStored: boolean; entryCreated: boolean }> {
    const result = { positionStored: false, entryCreated: false }
    if (!paths.includes(PATH_POSITION)) return result

    const latest = await this.readService.latestForPaths({ id: source.boatId }, SYNC_PATHS)
    const fix = readPosition(latest.get(PATH_POSITION))
    if (!fix) return result

    const recordedAt = DateTime.fromISO(latest.get(PATH_POSITION)!.recordedAt)
    const number = (path: string) => latest.get(path)?.value ?? null
    const sog = number(PATH_SOG)
    const cog = number(PATH_COG)
    const position: InstrumentPositionInput = {
      ...fix,
      sogKn: sog === null ? null : metersPerSecondToKnots(sog),
      cogDeg: cog === null ? null : radiansToDegrees(cog),
      recordedAt,
    }

    result.positionStored = await this.positionService.storeInstrumentPosition(
      source.boatId,
      position,
      now
    )
    if (!result.positionStored) return result

    result.entryCreated = await this.appendLogEntry(source.boatId, position, number)
    return result
  }

  /** Une entrée toutes les `INSTRUMENT_LOG_ENTRY_INTERVAL_MIN` minutes, sur la sortie en cours seulement. */
  private async appendLogEntry(
    boatId: number,
    position: InstrumentPositionInput,
    number: (path: string) => number | null
  ): Promise<boolean> {
    const log = await NavigationLog.query()
      .where('boatId', boatId)
      .where('status', 'in_progress')
      .orderBy('departedAt', 'desc')
      .first()
    if (!log || position.recordedAt < log.departedAt) return false

    const last = await this.entryService.lastInstrumentEntry(log)
    if (
      last &&
      position.recordedAt.diff(last.recordedAt, 'minutes').minutes <
        INSTRUMENT_LOG_ENTRY_INTERVAL_MIN
    ) {
      return false
    }

    const twd = number(PATH_TWD)
    const twa = number(PATH_TWA)
    const snapshot: Record<string, number> = {}
    const depth = number(PATH_DEPTH)
    const waterTemp = number(PATH_WATER_TEMP)
    const tws = number(PATH_TWS)
    if (depth !== null) snapshot.depthM = depth
    if (waterTemp !== null) snapshot.waterTemperatureC = kelvinToCelsius(waterTemp)
    if (tws !== null) snapshot.windSpeedKn = metersPerSecondToKnots(tws)

    await this.entryService.createFromInstruments(log, {
      recordedAt: position.recordedAt,
      latitude: position.latitude,
      longitude: position.longitude,
      cogDeg: position.cogDeg,
      sogKn: position.sogKn,
      twdDeg: twd === null ? null : radiansToDegrees(twd),
      twaDeg: twa === null ? null : radiansToDegrees(twa),
      weatherSnapshot: Object.keys(snapshot).length > 0 ? snapshot : null,
    })
    return true
  }
}
