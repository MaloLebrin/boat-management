import { BoatEquipmentNotFoundError } from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import BoatEnginePart from '#models/boat_engine_part'
import type User from '#models/user'
import type { BoatEnginePartPayload } from '#shared/types/boat'
import { assertBoatInUserOrg } from '#utils/boat_utils'
import { inject } from '@adonisjs/core'

export { BoatEquipmentNotFoundError }
export type { BoatEnginePartPayload }

@inject()
export default class BoatEnginePartService {
  async create(user: User, boat: Boat, engineId: number, payload: BoatEnginePartPayload) {
    assertBoatInUserOrg(user, boat)

    const engine = boat.engines.find((e) => e.id === engineId)
    if (!engine) throw new BoatEquipmentNotFoundError()

    return await BoatEnginePart.create({
      boatEngineId: engineId,
      designation: payload.designation,
      reference: payload.reference ?? null,
      stock: payload.stock ?? null,
      supplier: payload.supplier ?? null,
      notes: payload.notes ?? null,
    })
  }

  async update(
    user: User,
    boat: Boat,
    engineId: number,
    partId: number,
    payload: BoatEnginePartPayload
  ) {
    assertBoatInUserOrg(user, boat)

    const engine = boat.engines.find((e) => e.id === engineId)
    if (!engine) throw new BoatEquipmentNotFoundError()

    const part = await BoatEnginePart.query()
      .where('id', partId)
      .where('boatEngineId', engineId)
      .first()
    if (!part) throw new BoatEquipmentNotFoundError()

    part.designation = payload.designation
    part.reference = payload.reference ?? null
    part.stock = payload.stock ?? null
    part.supplier = payload.supplier ?? null
    part.notes = payload.notes ?? null

    await part.save()
    return part
  }

  async delete(user: User, boat: Boat, engineId: number, partId: number) {
    assertBoatInUserOrg(user, boat)

    const engine = boat.engines.find((e) => e.id === engineId)
    if (!engine) throw new BoatEquipmentNotFoundError()

    const part = await BoatEnginePart.query()
      .where('id', partId)
      .where('boatEngineId', engineId)
      .first()
    if (!part) throw new BoatEquipmentNotFoundError()

    await part.delete()
  }
}
