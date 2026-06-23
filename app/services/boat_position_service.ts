import BoatPositionHistory from '#models/boat_position_history'
import type Boat from '#models/boat'
import type { BoatPositionPayload } from '#shared/types/boat'
import { DateTime } from 'luxon'

export default class BoatPositionService {
  async storeManualPosition(boat: Boat, payload: BoatPositionPayload) {
    await BoatPositionHistory.query()
      .where('boatId', boat.id)
      .whereNull('endedAt')
      .update({ endedAt: DateTime.now().toSQL() })

    await BoatPositionHistory.create({
      boatId: boat.id,
      spotId: null,
      latitude: payload.latitude,
      longitude: payload.longitude,
      source: 'manual',
      startedAt: DateTime.now(),
      endedAt: null,
    })
  }
}
