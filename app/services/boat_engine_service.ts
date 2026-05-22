import { BoatEquipmentNotFoundError } from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import type User from '#models/user'
import type { BoatEnginePayload } from '#shared/types/boat'
import { assertBoatInUserOrg, toDateOrNull } from '#utils/boat_utils'
import { inject } from '@adonisjs/core'

export { BoatEquipmentNotFoundError }
export type { BoatEnginePayload }

@inject()
export default class BoatEngineService {
  async create(user: User, boat: Boat, payload: BoatEnginePayload) {
    assertBoatInUserOrg(user, boat)

    return await BoatEngine.create({
      boatId: boat.id,
      kind: payload.kind,
      fuel: payload.fuel ?? null,
      strokeType: payload.strokeType ?? null,
      brand: payload.brand ?? null,
      model: payload.model ?? null,
      serialNumber: payload.serialNumber ?? null,
      manufacturedAt: toDateOrNull(payload.manufacturedAt),
      powerHp: payload.powerHp ?? null,
      hours: payload.hours ?? null,
      installHours: payload.installHours ?? null,
    })
  }

  async update(user: User, boat: Boat, engineId: number, payload: BoatEnginePayload) {
    assertBoatInUserOrg(user, boat)

    const engine = await BoatEngine.query().where('id', engineId).where('boatId', boat.id).first()
    if (!engine) throw new BoatEquipmentNotFoundError()

    engine.kind = payload.kind
    engine.fuel = payload.fuel ?? null
    engine.strokeType = payload.strokeType ?? null
    engine.brand = payload.brand ?? null
    engine.model = payload.model ?? null
    engine.serialNumber = payload.serialNumber ?? null
    engine.manufacturedAt = toDateOrNull(payload.manufacturedAt)
    engine.powerHp = payload.powerHp ?? null
    engine.hours = payload.hours ?? null
    engine.installHours = payload.installHours ?? null

    await engine.save()
    return engine
  }

  async delete(user: User, boat: Boat, engineId: number) {
    assertBoatInUserOrg(user, boat)

    const engine = await BoatEngine.query().where('id', engineId).where('boatId', boat.id).first()
    if (!engine) throw new BoatEquipmentNotFoundError()

    await engine.delete()
  }

  async updateStatus(user: User, boat: Boat, engineId: number, status: string) {
    assertBoatInUserOrg(user, boat)

    const engine = await BoatEngine.query().where('id', engineId).where('boatId', boat.id).first()
    if (!engine) throw new BoatEquipmentNotFoundError()

    engine.status = status
    await engine.save()
  }

  async updateNotes(user: User, boat: Boat, engineId: number, notes: string | null) {
    assertBoatInUserOrg(user, boat)

    const engine = await BoatEngine.query().where('id', engineId).where('boatId', boat.id).first()
    if (!engine) throw new BoatEquipmentNotFoundError()

    engine.notes = notes
    await engine.save()
  }
}
