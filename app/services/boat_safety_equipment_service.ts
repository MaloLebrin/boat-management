import { BoatEquipmentNotFoundError } from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import BoatSafetyEquipment from '#models/boat_safety_equipment'
import type User from '#models/user'
import type { BoatSafetyEquipmentPayload } from '#shared/types/boat'
import { assertBoatInUserOrg, toDateOrNull } from '#utils/boat_utils'
import { inject } from '@adonisjs/core'

export { BoatEquipmentNotFoundError }
export type { BoatSafetyEquipmentPayload }

@inject()
export default class BoatSafetyEquipmentService {
  async create(user: User, boat: Boat, payload: BoatSafetyEquipmentPayload) {
    assertBoatInUserOrg(user, boat)

    return await BoatSafetyEquipment.create({
      boatId: boat.id,
      equipmentType: payload.equipmentType,
      quantity: payload.quantity ?? null,
      expiryDate: toDateOrNull(payload.expiryDate),
      status: (payload.status as 'ok' | 'to_check' | 'expired') ?? 'ok',
      notes: payload.notes ?? null,
    })
  }

  async update(user: User, boat: Boat, itemId: number, payload: BoatSafetyEquipmentPayload) {
    assertBoatInUserOrg(user, boat)

    const item = await BoatSafetyEquipment.query()
      .where('id', itemId)
      .where('boatId', boat.id)
      .first()
    if (!item) throw new BoatEquipmentNotFoundError()

    item.equipmentType = payload.equipmentType
    item.quantity = payload.quantity ?? null
    item.expiryDate = toDateOrNull(payload.expiryDate)
    item.status = (payload.status as 'ok' | 'to_check' | 'expired') ?? item.status
    item.notes = payload.notes ?? null

    await item.save()
    return item
  }

  async delete(user: User, boat: Boat, itemId: number) {
    assertBoatInUserOrg(user, boat)

    const item = await BoatSafetyEquipment.query()
      .where('id', itemId)
      .where('boatId', boat.id)
      .first()
    if (!item) throw new BoatEquipmentNotFoundError()

    await item.delete()
  }
}
