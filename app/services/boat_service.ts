import Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import BoatRig from '#models/boat_rig'
import BoatSail from '#models/boat_sail'
import type User from '#models/user'
import { DateTime } from 'luxon'

export class BoatNotFoundError extends Error {
  name = 'BoatNotFoundError'
}

export class BoatEquipmentNotFoundError extends Error {
  name = 'BoatEquipmentNotFoundError'
}

function toDateOrNull(value: Date | string | DateTime | null | undefined): DateTime | null {
  if (value === null || value === undefined) return null
  if (DateTime.isDateTime(value)) return value
  if (value instanceof Date) return DateTime.fromJSDate(value)
  return DateTime.fromISO(String(value))
}

export type BoatHullPayload = {
  name: string
  registrationNumber?: string | null
  type?: string | null

  manufacturedAt?: Date | string | DateTime | null
  propulsionType?: string | null
  lengthM?: number | null
  beamM?: number | null
  draftM?: number | null
  mastHeightM?: number | null
  hullMaterial?: string | null
  yearBuilt?: number | null
  manufacturer?: string | null
  model?: string | null
}

export type BoatEnginePayload = {
  kind: string
  fuel?: string | null
  strokeType?: string | null
  brand?: string | null
  model?: string | null
  serialNumber?: string | null
  manufacturedAt?: Date | string | DateTime | null
  powerHp?: number | null
  hours?: number | null
  status?: string | null
}

export type BoatSailPayload = {
  sailType: string
  manufacturedAt?: Date | string | DateTime | null
  areaM2?: number | null
  material?: string | null
  reefPoints?: number | null
  status?: string | null
}

export type BoatRigPayload = {
  rigType: string
  manufacturedAt?: Date | string | DateTime | null
  mastCount?: number | null
  spreaders?: number | null
  status?: string | null
}

function assertBoatInUserOrg(user: User, boat: Boat) {
  if (user.organizationId === null || user.organizationId !== boat.organizationId) {
    throw new BoatNotFoundError()
  }
}

export default class BoatService {
  async listForUser(user: User) {
    if (user.organizationId === null) return []

    return await Boat.query()
      .where('organizationId', user.organizationId)
      .preload('engines')
      .preload('sails')
      .preload('rig')
      .orderBy('id', 'desc')
  }

  async getForUserOrFail(user: User, boatId: number) {
    if (user.organizationId === null) throw new BoatNotFoundError()

    const boat = await Boat.query()
      .where('id', boatId)
      .where('organizationId', user.organizationId)
      .preload('engines')
      .preload('sails')
      .preload('rig')
      .first()

    if (!boat) throw new BoatNotFoundError()
    return boat
  }

  async createForUser(user: User, payload: BoatHullPayload) {
    if (user.organizationId === null) {
      throw new Error('User must belong to an organization to create boats')
    }

    if (
      payload.propulsionType === 'sailboat' &&
      (payload.mastHeightM === null || payload.mastHeightM === undefined)
    ) {
      throw new Error('mastHeightM is required when propulsionType is sailboat')
    }

    const boat = await Boat.create({
      organizationId: user.organizationId,
      name: payload.name,
      registrationNumber: payload.registrationNumber ?? null,
      type: payload.type ?? null,
      manufacturedAt: toDateOrNull(payload.manufacturedAt),

      propulsionType: payload.propulsionType ?? null,
      lengthM: payload.lengthM ?? null,
      beamM: payload.beamM ?? null,
      draftM: payload.draftM ?? null,
      mastHeightM: payload.mastHeightM ?? null,
      hullMaterial: payload.hullMaterial ?? null,
      yearBuilt: payload.yearBuilt ?? null,
      manufacturer: payload.manufacturer ?? null,
      model: payload.model ?? null,
    })

    await boat.load('engines')
    await boat.load('sails')
    await boat.load('rig')
    return boat
  }

  async updateForUser(user: User, boat: Boat, payload: BoatHullPayload) {
    assertBoatInUserOrg(user, boat)

    if (
      payload.propulsionType === 'sailboat' &&
      (payload.mastHeightM === null || payload.mastHeightM === undefined)
    ) {
      throw new Error('mastHeightM is required when propulsionType is sailboat')
    }

    boat.name = payload.name
    boat.registrationNumber = payload.registrationNumber ?? null
    boat.type = payload.type ?? null
    boat.manufacturedAt = toDateOrNull(payload.manufacturedAt)

    boat.propulsionType = payload.propulsionType ?? null
    boat.lengthM = payload.lengthM ?? null
    boat.beamM = payload.beamM ?? null
    boat.draftM = payload.draftM ?? null
    boat.mastHeightM = payload.mastHeightM ?? null
    boat.hullMaterial = payload.hullMaterial ?? null
    boat.yearBuilt = payload.yearBuilt ?? null
    boat.manufacturer = payload.manufacturer ?? null
    boat.model = payload.model ?? null

    await boat.save()

    await boat.load('engines')
    await boat.load('sails')
    await boat.load('rig')
    return boat
  }

  async deleteForUser(user: User, boat: Boat) {
    assertBoatInUserOrg(user, boat)

    await BoatEngine.query().where('boatId', boat.id).delete()
    await BoatSail.query().where('boatId', boat.id).delete()
    await BoatRig.query().where('boatId', boat.id).delete()
    await boat.delete()
  }

  async createEngine(user: User, boat: Boat, payload: BoatEnginePayload) {
    assertBoatInUserOrg(user, boat)

    const engine = await BoatEngine.create({
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
    })

    return engine
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

  async createSail(user: User, boat: Boat, payload: BoatSailPayload) {
    assertBoatInUserOrg(user, boat)

    const sail = await BoatSail.create({
      boatId: boat.id,
      sailType: payload.sailType,
      manufacturedAt: toDateOrNull(payload.manufacturedAt),
      areaM2: payload.areaM2 ?? null,
      material: payload.material ?? null,
      reefPoints: payload.reefPoints ?? null,
    })

    return sail
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
      await rig.save()
    } else {
      rig = await BoatRig.create({
        boatId: boat.id,
        rigType: payload.rigType,
        manufacturedAt: toDateOrNull(payload.manufacturedAt),
        mastCount: payload.mastCount ?? null,
        spreaders: payload.spreaders ?? null,
      })
    }

    return rig
  }

  async deleteRig(user: User, boat: Boat) {
    assertBoatInUserOrg(user, boat)

    await BoatRig.query().where('boatId', boat.id).delete()
  }
}
