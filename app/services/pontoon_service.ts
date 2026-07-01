import Boat from '#models/boat'
import Pontoon from '#models/pontoon'
import Spot from '#models/spot'
import type Port from '#models/port'
import type User from '#models/user'
import { PontoonHasBoatsError, PontoonNotFoundError } from '#exceptions/port_errors'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'

export type PontoonPayload = {
  name: string
  description?: string | null
}

@inject()
export default class PontoonService {
  /**
   * Gets a pontoon for the given port or throws PontoonNotFoundError.
   */
  async getForUserOrFail(user: User, portId: number, pontoonId: number): Promise<Pontoon> {
    if (user.organizationId === null) throw new PontoonNotFoundError()
    const orgId = user.organizationId

    const pontoon = await Pontoon.query()
      .where('id', pontoonId)
      .where('portId', portId)
      .whereHas('port', (q) => q.where('organizationId', orgId))
      .first()

    if (!pontoon) throw new PontoonNotFoundError()
    return pontoon
  }

  async getForPortOrFail(portId: number, pontoonId: number): Promise<Pontoon> {
    const pontoon = await Pontoon.query().where('id', pontoonId).where('portId', portId).first()

    if (!pontoon) throw new PontoonNotFoundError()

    return pontoon
  }

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
    await db.transaction(async (trx) => {
      const spots = await Spot.query()
        .useTransaction(trx)
        .where('pontoonId', pontoon.id)
        .select('id')
      const spotIds = spots.map((s) => s.id)

      if (spotIds.length > 0) {
        const result = await Boat.query()
          .useTransaction(trx)
          .whereIn('spotId', spotIds)
          .count('id as count')
          .first()

        if (Number(result?.$extras['count'] ?? 0) > 0) throw new PontoonHasBoatsError()
      }

      await pontoon.useTransaction(trx).delete()
    })
  }

  async updatePosition(pontoon: Pontoon, payload: { x: number; y: number }) {
    pontoon.positionX = payload.x
    pontoon.positionY = payload.y
    await pontoon.save()
    return pontoon
  }
}
