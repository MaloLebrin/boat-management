import { BoatNotFoundError } from '#exceptions/boat_errors'
import Boat from '#models/boat'
import BoatPositionHistory from '#models/boat_position_history'
import type User from '#models/user'
import type { BoatPositionPayload } from '#shared/types/boat'
import { DateTime } from 'luxon'

export default class BoatPositionService {
  async storeManualPosition(user: User, boatId: number, payload: BoatPositionPayload) {
    if (user.organizationId === null) throw new BoatNotFoundError()

    const boat = await Boat.query()
      .where('id', boatId)
      .where('organizationId', user.organizationId)
      .first()

    if (!boat) throw new BoatNotFoundError()

    await BoatPositionHistory.query()
      .where('boatId', boat.id)
      .whereNull('endedAt')
      .whereNull('spotId')
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
