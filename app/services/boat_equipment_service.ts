import { BoatEquipmentNotFoundError, BoatNotFoundError } from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import BoatEnginePart from '#models/boat_engine_part'
import BoatRig from '#models/boat_rig'
import BoatSafetyEquipment from '#models/boat_safety_equipment'
import BoatSail from '#models/boat_sail'
import type User from '#models/user'
import type {
  BoatEnginePartPayload,
  BoatEnginePayload,
  BoatRigPayload,
  BoatSafetyEquipmentPayload,
  BoatSailPayload,
} from '#shared/types/boat'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

export { BoatEquipmentNotFoundError, BoatNotFoundError }
export type {
  BoatEnginePartPayload,
  BoatEnginePayload,
  BoatRigPayload,
  BoatSafetyEquipmentPayload,
  BoatSailPayload
}

// TODO: Move to shared utils
function toDateOrNull(value: Date | string | DateTime | null | undefined): DateTime | null {
  if (value === null || value === undefined) return null
  if (DateTime.isDateTime(value)) return value
  if (value instanceof Date) return DateTime.fromJSDate(value)
  return DateTime.fromISO(String(value))
}

// TODO: Move to shared utils
function assertBoatInUserOrg(user: User, boat: Boat) {
  if (user.organizationId === null || user.organizationId !== boat.organizationId) {
    throw new BoatNotFoundError()
  }
}

// TODO: split services into smaller services (engine, sail, rig, safety equipment, engine part)

@inject()
export default class BoatEquipmentService {
  async createEngine(user: User, boat: Boat, payload: BoatEnginePayload) {
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

  async updateEngine(user: User, boat: Boat, engineId: number, payload: BoatEnginePayload) {
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

  async deleteEngine(user: User, boat: Boat, engineId: number) {
    assertBoatInUserOrg(user, boat)

    const engine = await BoatEngine.query().where('id', engineId).where('boatId', boat.id).first()

    if (!engine) throw new BoatEquipmentNotFoundError()

    await engine.delete()
  }

  async updateEngineStatus(user: User, boat: Boat, engineId: number, status: string) {
    assertBoatInUserOrg(user, boat)

    const engine = await BoatEngine.query().where('id', engineId).where('boatId', boat.id).first()

    if (!engine) throw new BoatEquipmentNotFoundError()

    engine.status = status
    await engine.save()
  }

  async updateEngineNotes(user: User, boat: Boat, engineId: number, notes: string | null) {
    assertBoatInUserOrg(user, boat)

    const engine = await BoatEngine.query().where('id', engineId).where('boatId', boat.id).first()

    if (!engine) throw new BoatEquipmentNotFoundError()

    engine.notes = notes
    await engine.save()
  }

  async createSail(user: User, boat: Boat, payload: BoatSailPayload) {
    assertBoatInUserOrg(user, boat)

    return await BoatSail.create({
      boatId: boat.id,
      sailType: payload.sailType,
      manufacturedAt: toDateOrNull(payload.manufacturedAt),
      areaM2: payload.areaM2 ?? null,
      material: payload.material ?? null,
      reefPoints: payload.reefPoints ?? null,
    })
  }

  async updateSail(user: User, boat: Boat, sailId: number, payload: BoatSailPayload) {
    assertBoatInUserOrg(user, boat)

    const sail = await BoatSail.query().where('id', sailId).where('boatId', boat.id).first()

    if (!sail) throw new BoatEquipmentNotFoundError()

    sail.sailType = payload.sailType
    sail.manufacturedAt = toDateOrNull(payload.manufacturedAt)
    sail.areaM2 = payload.areaM2 ?? null
    sail.material = payload.material ?? null
    sail.reefPoints = payload.reefPoints ?? null
    sail.notes = payload.notes ?? null

    await sail.save()
    return sail
  }

  async deleteSail(user: User, boat: Boat, sailId: number) {
    assertBoatInUserOrg(user, boat)

    const sail = await BoatSail.query().where('id', sailId).where('boatId', boat.id).first()

    if (!sail) throw new BoatEquipmentNotFoundError()

    await sail.delete()
  }

  async upsertRig(user: User, boat: Boat, payload: BoatRigPayload) {
    assertBoatInUserOrg(user, boat)

    let rig = await BoatRig.query().where('boatId', boat.id).first()

    if (rig) {
      rig.rigType = payload.rigType
      rig.manufacturedAt = toDateOrNull(payload.manufacturedAt)
      rig.mastCount = payload.mastCount ?? null
      rig.spreaders = payload.spreaders ?? null
      rig.notes = payload.notes ?? null
      await rig.save()
    } else {
      rig = await BoatRig.create({
        boatId: boat.id,
        rigType: payload.rigType,
        manufacturedAt: toDateOrNull(payload.manufacturedAt),
        mastCount: payload.mastCount ?? null,
        spreaders: payload.spreaders ?? null,
        notes: payload.notes ?? null,
      })
    }

    return rig
  }

  async deleteRig(user: User, boat: Boat) {
    assertBoatInUserOrg(user, boat)

    await BoatRig.query().where('boatId', boat.id).delete()
  }

  async createEnginePart(user: User, boat: Boat, engineId: number, payload: BoatEnginePartPayload) {
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

  async updateEnginePart(
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

  async deleteEnginePart(user: User, boat: Boat, engineId: number, partId: number) {
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

  async createSafetyEquipment(user: User, boat: Boat, payload: BoatSafetyEquipmentPayload) {
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

  async updateSafetyEquipment(
    user: User,
    boat: Boat,
    itemId: number,
    payload: BoatSafetyEquipmentPayload
  ) {
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

  async deleteSafetyEquipment(user: User, boat: Boat, itemId: number) {
    assertBoatInUserOrg(user, boat)
    const item = await BoatSafetyEquipment.query()
      .where('id', itemId)
      .where('boatId', boat.id)
      .first()
    if (!item) throw new BoatEquipmentNotFoundError()
    await item.delete()
  }
}
