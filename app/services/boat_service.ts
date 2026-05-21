import { BoatEquipmentNotFoundError, BoatNotFoundError } from '#exceptions/boat_errors'
import Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import BoatRig from '#models/boat_rig'
import BoatSail from '#models/boat_sail'
import type User from '#models/user'
import type {
  BoatEnginePartPayload,
  BoatEnginePayload,
  BoatHullPayload,
  BoatRigPayload,
  BoatSafetyEquipmentPayload,
  BoatSailPayload,
} from '#shared/types/boat'
import { DateTime } from 'luxon'

export { BoatEquipmentNotFoundError, BoatNotFoundError }
export type {
  BoatEnginePartPayload,
  BoatEnginePayload,
  BoatHullPayload,
  BoatRigPayload,
  BoatSafetyEquipmentPayload,
  BoatSailPayload
}

function toDateOrNull(value: Date | string | DateTime | null | undefined): DateTime | null {
  if (value === null || value === undefined) return null
  if (DateTime.isDateTime(value)) return value
  if (value instanceof Date) return DateTime.fromJSDate(value)
  return DateTime.fromISO(String(value))
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

  async getFullDetailForUser(user: User, boatId: number) {
    if (user.organizationId === null) throw new BoatNotFoundError()

    const boat = await Boat.query()
      .where('id', boatId)
      .where('organizationId', user.organizationId)
      .first()

    if (!boat) throw new BoatNotFoundError()

    await Promise.all([
      boat.load('engines'),
      boat.load('sails'),
      boat.load('rig'),
      boat.load('safetyEquipment'),
      boat.load('spot', (q) =>
        q
          .preload('pontoon', (pq) => pq.preload('port'))
          .preload('mouillage', (mq) => mq.preload('port'))
      ),
    ])

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

      homePort: payload.homePort ?? null,
      navigationCategory: payload.navigationCategory ?? null,
      hullIdentificationNumber: payload.hullIdentificationNumber ?? null,
      francisationNumber: payload.francisationNumber ?? null,
      flagCountry: payload.flagCountry ?? null,
      maxPersons: payload.maxPersons ?? null,

      spotId: payload.spotId ?? null,
    })

    if (boat.spotId !== null) {
      await this._logBerthChange(boat, boat.spotId)
    }

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

    boat.homePort = payload.homePort ?? null
    boat.navigationCategory = payload.navigationCategory ?? null
    boat.hullIdentificationNumber = payload.hullIdentificationNumber ?? null
    boat.francisationNumber = payload.francisationNumber ?? null
    boat.flagCountry = payload.flagCountry ?? null
    boat.maxPersons = payload.maxPersons ?? null

    if (payload.spotId !== undefined) {
      const newSpotId = payload.spotId ?? null

      if (newSpotId !== boat.spotId) {
        await this._logBerthChange(boat, newSpotId)
      }

      boat.spotId = newSpotId
    }

    await boat.save()

    await boat.load('engines')
    await boat.load('sails')
    await boat.load('rig')
    return boat
  }

  private async _logBerthChange(boat: Boat, newSpotId: number | null) {
    const BoatPositionHistory = (await import('#models/boat_position_history')).default
    await BoatPositionHistory.query()
      .where('boatId', boat.id)
      .whereNull('endedAt')
      .update({ endedAt: DateTime.now().toSQL() })

    if (newSpotId !== null) {
      await BoatPositionHistory.create({
        boatId: boat.id,
        spotId: newSpotId,
        startedAt: DateTime.now(),
        endedAt: null,
      })
    }
  }

  async deleteForUser(user: User, boat: Boat) {
    assertBoatInUserOrg(user, boat)

    await BoatEngine.query().where('boatId', boat.id).delete()
    await BoatSail.query().where('boatId', boat.id).delete()
    await BoatRig.query().where('boatId', boat.id).delete()
    await boat.delete()
  }

  async updateAssignment(boat: Boat, payload: { spotId: number | null }) {
    boat.spotId = payload.spotId
    await boat.save()

    await this._logBerthChange(boat, payload.spotId)

    return boat
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
      installHours: payload.installHours ?? null,
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

  async updateEngineNotes(user: User, boat: Boat, engineId: number, notes: string | null) {
    assertBoatInUserOrg(user, boat)

    const engine = await BoatEngine.query().where('id', engineId).where('boatId', boat.id).first()

    if (!engine) throw new BoatEquipmentNotFoundError()

    engine.notes = notes
    await engine.save()
  }

  async deleteRig(user: User, boat: Boat) {
    assertBoatInUserOrg(user, boat)

    await BoatRig.query().where('boatId', boat.id).delete()
  }

  async createEnginePart(user: User, boat: Boat, engineId: number, payload: BoatEnginePartPayload) {
    assertBoatInUserOrg(user, boat)
    const engine = boat.engines.find((e) => e.id === engineId)
    if (!engine) throw new BoatEquipmentNotFoundError()
    const BoatEnginePart = (await import('#models/boat_engine_part')).default
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
    const BoatEnginePart = (await import('#models/boat_engine_part')).default
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
    const BoatEnginePart = (await import('#models/boat_engine_part')).default
    const part = await BoatEnginePart.query()
      .where('id', partId)
      .where('boatEngineId', engineId)
      .first()
    if (!part) throw new BoatEquipmentNotFoundError()
    await part.delete()
  }

  async createSafetyEquipment(user: User, boat: Boat, payload: BoatSafetyEquipmentPayload) {
    assertBoatInUserOrg(user, boat)
    const BoatSafetyEquipment = (await import('#models/boat_safety_equipment')).default
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
    const BoatSafetyEquipment = (await import('#models/boat_safety_equipment')).default
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
    const BoatSafetyEquipment = (await import('#models/boat_safety_equipment')).default
    const item = await BoatSafetyEquipment.query()
      .where('id', itemId)
      .where('boatId', boat.id)
      .first()
    if (!item) throw new BoatEquipmentNotFoundError()
    await item.delete()
  }
}
