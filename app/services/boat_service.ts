import Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import BoatRig from '#models/boat_rig'
import BoatSail from '#models/boat_sail'
import type User from '#models/user'
import db from '@adonisjs/lucid/services/db'

export class BoatNotFoundError extends Error {
  name = 'BoatNotFoundError'
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

  async createForUser(
    user: User,
    payload: {
      name: string
      registrationNumber?: string | null
      type?: string | null

      manufacturedAt?: Date | string | null
      propulsionType?: string | null
      lengthM?: number | null
      beamM?: number | null
      draftM?: number | null
      mastHeightM?: number | null
      hullMaterial?: string | null
      yearBuilt?: number | null
      manufacturer?: string | null
      model?: string | null

      engines?: Array<{
        kind: string
        fuel?: string | null
        brand?: string | null
        model?: string | null
        serialNumber?: string | null
        manufacturedAt?: Date | string | null
        powerHp?: number | null
        hours?: number | null
      }>
      sails?: Array<{
        sailType: string
        manufacturedAt?: Date | string | null
        areaM2?: number | null
        material?: string | null
        reefPoints?: number | null
      }>
      rig?: {
        rigType: string
        manufacturedAt?: Date | string | null
        mastCount?: number | null
        spreaders?: number | null
      } | null
    }
  ) {
    if (user.organizationId === null) {
      throw new Error('User must belong to an organization to create boats')
    }

    if (
      payload.propulsionType === 'sailboat' &&
      (payload.mastHeightM === null || payload.mastHeightM === undefined)
    ) {
      throw new Error('mastHeightM is required when propulsionType is sailboat')
    }

    return await db.transaction(async (trx) => {
      const boat = await Boat.create(
        {
          organizationId: user.organizationId!,
          name: payload.name,
          registrationNumber: payload.registrationNumber ?? null,
          type: payload.type ?? null,
          manufacturedAt: payload.manufacturedAt ?? null,

          propulsionType: payload.propulsionType ?? null,
          lengthM: payload.lengthM ?? null,
          beamM: payload.beamM ?? null,
          draftM: payload.draftM ?? null,
          mastHeightM: payload.mastHeightM ?? null,
          hullMaterial: payload.hullMaterial ?? null,
          yearBuilt: payload.yearBuilt ?? null,
          manufacturer: payload.manufacturer ?? null,
          model: payload.model ?? null,
        },
        { client: trx }
      )

      if (payload.engines?.length) {
        await BoatEngine.createMany(
          payload.engines.map((e) => ({
            boatId: boat.id,
            kind: e.kind,
            fuel: e.fuel ?? null,
            brand: e.brand ?? null,
            model: e.model ?? null,
            serialNumber: e.serialNumber ?? null,
            manufacturedAt: e.manufacturedAt ?? null,
            powerHp: e.powerHp ?? null,
            hours: e.hours ?? null,
          })),
          { client: trx }
        )
      }

      if (payload.sails?.length) {
        await BoatSail.createMany(
          payload.sails.map((s) => ({
            boatId: boat.id,
            sailType: s.sailType,
            manufacturedAt: s.manufacturedAt ?? null,
            areaM2: s.areaM2 ?? null,
            material: s.material ?? null,
            reefPoints: s.reefPoints ?? null,
          })),
          { client: trx }
        )
      }

      if (payload.rig) {
        await BoatRig.create(
          {
            boatId: boat.id,
            rigType: payload.rig.rigType,
            manufacturedAt: payload.rig.manufacturedAt ?? null,
            mastCount: payload.rig.mastCount ?? null,
            spreaders: payload.rig.spreaders ?? null,
          },
          { client: trx }
        )
      }

      await boat.load('engines')
      await boat.load('sails')
      await boat.load('rig')
      return boat
    })
  }

  async updateForUser(
    user: User,
    boat: Boat,
    payload: {
      name: string
      registrationNumber?: string | null
      type?: string | null

      manufacturedAt?: Date | string | null
      propulsionType?: string | null
      lengthM?: number | null
      beamM?: number | null
      draftM?: number | null
      mastHeightM?: number | null
      hullMaterial?: string | null
      yearBuilt?: number | null
      manufacturer?: string | null
      model?: string | null

      engines?: Array<{
        kind: string
        fuel?: string | null
        brand?: string | null
        model?: string | null
        serialNumber?: string | null
        manufacturedAt?: Date | string | null
        powerHp?: number | null
        hours?: number | null
      }>
      sails?: Array<{
        sailType: string
        manufacturedAt?: Date | string | null
        areaM2?: number | null
        material?: string | null
        reefPoints?: number | null
      }>
      rig?: {
        rigType: string
        manufacturedAt?: Date | string | null
        mastCount?: number | null
        spreaders?: number | null
      } | null
    }
  ) {
    if (user.organizationId === null || user.organizationId !== boat.organizationId) {
      throw new BoatNotFoundError()
    }

    if (
      payload.propulsionType === 'sailboat' &&
      (payload.mastHeightM === null || payload.mastHeightM === undefined)
    ) {
      throw new Error('mastHeightM is required when propulsionType is sailboat')
    }

    return await db.transaction(async (trx) => {
      boat.useTransaction(trx)

      boat.name = payload.name
      boat.registrationNumber = payload.registrationNumber ?? null
      boat.type = payload.type ?? null
      boat.manufacturedAt = payload.manufacturedAt ?? null

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

      if (payload.engines) {
        await BoatEngine.query({ client: trx }).where('boatId', boat.id).delete()
        if (payload.engines.length) {
          await BoatEngine.createMany(
            payload.engines.map((e) => ({
              boatId: boat.id,
              kind: e.kind,
              fuel: e.fuel ?? null,
              brand: e.brand ?? null,
              model: e.model ?? null,
              serialNumber: e.serialNumber ?? null,
              manufacturedAt: e.manufacturedAt ?? null,
              powerHp: e.powerHp ?? null,
              hours: e.hours ?? null,
            })),
            { client: trx }
          )
        }
      }

      if (payload.sails) {
        await BoatSail.query({ client: trx }).where('boatId', boat.id).delete()
        if (payload.sails.length) {
          await BoatSail.createMany(
            payload.sails.map((s) => ({
              boatId: boat.id,
              sailType: s.sailType,
              manufacturedAt: s.manufacturedAt ?? null,
              areaM2: s.areaM2 ?? null,
              material: s.material ?? null,
              reefPoints: s.reefPoints ?? null,
            })),
            { client: trx }
          )
        }
      }

      if (payload.rig !== undefined) {
        await BoatRig.query({ client: trx }).where('boatId', boat.id).delete()
        if (payload.rig) {
          await BoatRig.create(
            {
              boatId: boat.id,
              rigType: payload.rig.rigType,
              manufacturedAt: payload.rig.manufacturedAt ?? null,
              mastCount: payload.rig.mastCount ?? null,
              spreaders: payload.rig.spreaders ?? null,
            },
            { client: trx }
          )
        }
      }

      await boat.load('engines')
      await boat.load('sails')
      await boat.load('rig')
      return boat
    })
  }

  async deleteForUser(user: User, boat: Boat) {
    if (user.organizationId === null || user.organizationId !== boat.organizationId) {
      throw new BoatNotFoundError()
    }

    await BoatEngine.query().where('boatId', boat.id).delete()
    await BoatSail.query().where('boatId', boat.id).delete()
    await BoatRig.query().where('boatId', boat.id).delete()
    await boat.delete()
  }
}
