import Boat from '#models/boat'
import Mouillage from '#models/mouillage'
import Spot from '#models/spot'
import type Port from '#models/port'
import { MouillageHasBoatsError } from '#services/port_service'

export type MouillagePayload = {
  name: string
  description?: string | null
}

export default class MouillageService {
  async createForPort(port: Port, payload: MouillagePayload) {
    return await Mouillage.create({
      portId: port.id,
      name: payload.name,
      description: payload.description ?? null,
    })
  }

  async updateForPort(mouillage: Mouillage, payload: MouillagePayload) {
    mouillage.name = payload.name
    mouillage.description = payload.description ?? null
    await mouillage.save()
    return mouillage
  }

  async deleteForPort(mouillage: Mouillage) {
    const spots = await Spot.query().where('mouillageId', mouillage.id).select('id')
    const spotIds = spots.map((s) => s.id)

    if (spotIds.length > 0) {
      const result = await Boat.query().whereIn('spotId', spotIds).count('id as count').first()

      if (Number(result?.$extras['count'] ?? 0) > 0) throw new MouillageHasBoatsError()
    }

    await mouillage.delete()
  }

  async updatePosition(mouillage: Mouillage, payload: { x: number; y: number }) {
    mouillage.positionX = payload.x
    mouillage.positionY = payload.y
    await mouillage.save()
    return mouillage
  }
}
