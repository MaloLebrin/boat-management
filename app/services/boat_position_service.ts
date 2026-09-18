import BoatPositionHistory from '#models/boat_position_history'
import type Boat from '#models/boat'
import type { BoatPositionPayload } from '#shared/types/boat'
import { DateTime } from 'luxon'

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
}
