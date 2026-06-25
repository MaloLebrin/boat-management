import { BoatEquipmentNotFoundError } from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import BoatSail from '#models/boat_sail'
import type User from '#models/user'
import type { BoatSailPayload } from '#shared/types/boat'
import { assertBoatInUserOrg, toDateOrNull } from '#utils/boat_utils'
import { inject } from '@adonisjs/core'

export { BoatEquipmentNotFoundError }
export type { BoatSailPayload }

@inject()
export default class BoatSailService {
  async create(user: User, boat: Boat, payload: BoatSailPayload) {
    assertBoatInUserOrg(user, boat)

    return await BoatSail.create({
      boatId: boat.id,
      sailType: payload.sailType,
      manufacturedAt: toDateOrNull(payload.manufacturedAt),
      areaM2: payload.areaM2 ?? null,
      material: payload.material ?? null,
      reefPoints: payload.reefPoints ?? null,
      purchasePrice: payload.purchasePrice ?? null,
      purchasedAt: toDateOrNull(payload.purchasedAt),
    })
  }

  async update(user: User, boat: Boat, sailId: number, payload: BoatSailPayload) {
    assertBoatInUserOrg(user, boat)

    const sail = await BoatSail.query().where('id', sailId).where('boatId', boat.id).first()
    if (!sail) throw new BoatEquipmentNotFoundError()

    sail.sailType = payload.sailType
    sail.manufacturedAt = toDateOrNull(payload.manufacturedAt)
    sail.areaM2 = payload.areaM2 ?? null
    sail.material = payload.material ?? null
    sail.reefPoints = payload.reefPoints ?? null
    sail.notes = payload.notes ?? null
    sail.purchasePrice = payload.purchasePrice ?? null
    sail.purchasedAt = toDateOrNull(payload.purchasedAt)

    await sail.save()
    return sail
  }

  async delete(user: User, boat: Boat, sailId: number) {
    assertBoatInUserOrg(user, boat)

    const sail = await BoatSail.query().where('id', sailId).where('boatId', boat.id).first()
    if (!sail) throw new BoatEquipmentNotFoundError()

    await sail.delete()
  }
}
