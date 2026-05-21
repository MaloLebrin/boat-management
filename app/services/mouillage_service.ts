import Boat from '#models/boat'
import Mouillage from '#models/mouillage'
import Spot from '#models/spot'
import type Port from '#models/port'
import { MouillageHasBoatsError, MouillageNotFoundError } from '#exceptions/port_errors'
import { inject } from '@adonisjs/core'

export type MouillagePayload = {
  name: string
  description?: string | null
}

@inject()
export default class MouillageService {
  /**
   * Gets a mouillage for the given port or throws MouillageNotFoundError.
   */
  async getForPortOrFail(portId: number, mouillageId: number): Promise<Mouillage> {
    const mouillage = await Mouillage.query()
      .where('id', mouillageId)
      .where('portId', portId)
      .first()

    if (!mouillage) throw new MouillageNotFoundError()

    return mouillage
  }

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
