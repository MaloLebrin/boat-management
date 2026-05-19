import Boat from '#models/boat'
import Pontoon from '#models/pontoon'
import type Port from '#models/port'
import { PontoonHasBoatsError } from '#services/port_service'

export type PontoonPayload = {
  name: string
  description?: string | null
}

export default class PontoonService {
  async createForPort(port: Port, payload: PontoonPayload) {
    return await Pontoon.create({
      portId: port.id,
      name: payload.name,
      description: payload.description ?? null,
    })
  }

  async updateForPort(pontoon: Pontoon, payload: PontoonPayload) {
    pontoon.name = payload.name
    pontoon.description = payload.description ?? null
    await pontoon.save()
    return pontoon
  }

  async deleteForPort(pontoon: Pontoon) {
    const result = await Boat.query().where('pontoonId', pontoon.id).count('id as count').first()

    if (Number(result?.$extras['count'] ?? 0) > 0) throw new PontoonHasBoatsError()

    await pontoon.delete()
  }
}
