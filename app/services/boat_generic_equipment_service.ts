import { BoatEquipmentNotFoundError } from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import BoatGenericEquipment from '#models/boat_generic_equipment'
import type User from '#models/user'
import type { BoatGenericEquipmentPayload } from '#shared/types/boat'
import { assertBoatInUserOrg, toDateOrNull } from '#utils/boat_utils'
import { inject } from '@adonisjs/core'

export { BoatEquipmentNotFoundError }
export type { BoatGenericEquipmentPayload }

@inject()
export default class BoatGenericEquipmentService {
  async create(user: User, boat: Boat, payload: BoatGenericEquipmentPayload) {
    assertBoatInUserOrg(user, boat)

    return await BoatGenericEquipment.create({
      boatId: boat.id,
      category: payload.category,
      name: payload.name,
      brand: payload.brand ?? null,
      model: payload.model ?? null,
      quantity: payload.quantity ?? null,
      status: (payload.status as 'ok' | 'to_check' | 'to_replace') ?? 'ok',
      notes: payload.notes ?? null,
      purchasePrice: payload.purchasePrice ?? null,
      purchasedAt: toDateOrNull(payload.purchasedAt),
    })
  }

  async update(user: User, boat: Boat, itemId: number, payload: BoatGenericEquipmentPayload) {
    assertBoatInUserOrg(user, boat)

    const item = await BoatGenericEquipment.query()
      .where('id', itemId)
      .where('boatId', boat.id)
      .first()
    if (!item) throw new BoatEquipmentNotFoundError()

    item.category = payload.category
    item.name = payload.name
    item.brand = payload.brand ?? null
    item.model = payload.model ?? null
    item.quantity = payload.quantity ?? null
    item.status = (payload.status as 'ok' | 'to_check' | 'to_replace') ?? item.status
    item.notes = payload.notes ?? null
    item.purchasePrice = payload.purchasePrice ?? null
    item.purchasedAt = toDateOrNull(payload.purchasedAt)

    await item.save()
    return item
  }

  async delete(user: User, boat: Boat, itemId: number) {
    assertBoatInUserOrg(user, boat)

    const item = await BoatGenericEquipment.query()
      .where('id', itemId)
      .where('boatId', boat.id)
      .first()
    if (!item) throw new BoatEquipmentNotFoundError()

    await item.delete()
  }
}
