import Spot from '#models/spot'
import type Mouillage from '#models/mouillage'
import type Pontoon from '#models/pontoon'
import type Port from '#models/port'
import type { SpotPayload } from '#shared/types/spot'

export default class SpotService {
  async createForPontoon(pontoon: Pontoon, port: Port, payload: SpotPayload) {
    return await Spot.create({
      organizationId: port.organizationId,
      pontoonId: pontoon.id,
      mouillageId: null,
      name: payload.name,
      description: payload.description ?? null,
    })
  }

  async createForMouillage(mouillage: Mouillage, port: Port, payload: SpotPayload) {
    return await Spot.create({
      organizationId: port.organizationId,
      mouillageId: mouillage.id,
      pontoonId: null,
      name: payload.name,
      description: payload.description ?? null,
    })
  }

  async update(spot: Spot, payload: SpotPayload) {
    spot.name = payload.name
    spot.description = payload.description ?? null
    await spot.save()
    return spot
  }

  async delete(spot: Spot) {
    await spot.delete()
  }
}
