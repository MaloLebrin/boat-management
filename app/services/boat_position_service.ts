import BoatPositionHistory from '#models/boat_position_history'
import type Boat from '#models/boat'
import type { BoatPositionPayload } from '#shared/types/boat'
import { DateTime } from 'luxon'
import {
  POSITION_UPDATE_MAX_AGE_MIN,
  POSITION_UPDATE_MAX_DISTANCE_M,
} from '#shared/constants/instrument_sync'
import { haversineDistanceMeters } from '#shared/helpers/geo'
import type { InstrumentPositionInput } from '#shared/types/instruments'

export default class BoatPositionService {
  async storeManualPosition(boat: Boat, payload: BoatPositionPayload) {
    // Ne clôt que le point de position précédent : le séjour à quai en cours,
    // s'il y en a un, ne regarde pas où le bateau est passé (#722).
    await BoatPositionHistory.closeOpenOfKind(boat.id, 'position')

    await BoatPositionHistory.create({
      boatId: boat.id,
      kind: 'position',
      spotId: null,
      latitude: payload.latitude,
      longitude: payload.longitude,
      source: 'manual',
      startedAt: DateTime.now(),
      endedAt: null,
    })
  }

  /**
   * Position issue des instruments (#991). Retourne `true` si le fix a été
   * pris en compte (mise à jour en place ou nouvelle ligne), `false` s'il est
   * plus ancien que la ligne ouverte — un lot rejoué après coup ne doit pas
   * ramener le bateau en arrière.
   */
  async storeInstrumentPosition(
    boatId: number,
    input: InstrumentPositionInput,
    now: DateTime = DateTime.now()
  ): Promise<boolean> {
    const open = await BoatPositionHistory.query()
      .where('boatId', boatId)
      .where('kind', 'position')
      .whereNull('endedAt')
      .orderBy('startedAt', 'desc')
      .first()

    if (open && input.recordedAt < open.startedAt) return false

    const fresh =
      open !== null &&
      now.diff(open.updatedAt ?? open.startedAt, 'minutes').minutes < POSITION_UPDATE_MAX_AGE_MIN
    const near =
      open !== null &&
      open.latitude !== null &&
      open.longitude !== null &&
      haversineDistanceMeters(
        { latitude: Number(open.latitude), longitude: Number(open.longitude) },
        input
      ) < POSITION_UPDATE_MAX_DISTANCE_M

    if (open && fresh && near) {
      open.merge({
        latitude: input.latitude,
        longitude: input.longitude,
        speedKnots: input.sogKn,
        headingDegrees: input.cogDeg,
      })
      await open.save()
      return true
    }

    await BoatPositionHistory.closeOpenOfKind(boatId, 'position')
    await BoatPositionHistory.create({
      boatId,
      kind: 'position',
      spotId: null,
      latitude: input.latitude,
      longitude: input.longitude,
      speedKnots: input.sogKn,
      headingDegrees: input.cogDeg,
      source: 'gps',
      startedAt: input.recordedAt,
      endedAt: null,
    })
    return true
  }
}
