import { BoatNotFoundError } from '#exceptions/boat_errors'
import Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import BoatRig from '#models/boat_rig'
import BoatSail from '#models/boat_sail'
import type User from '#models/user'
import type { BoatHullPayload } from '#shared/types/boat'

import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import { assertBoatInUserOrg, toDateOrNull } from '#utils/boat_utils'

export { BoatNotFoundError }
export type { BoatHullPayload }

@inject()
export default class BoatHullService {
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

  async getPositionHistory(boatId: number) {
    const module = await import('#models/boat_position_history') // TODO: use import instead of await import with inject decorator
    const BoatPositionHistoryModel = module.default
    return await BoatPositionHistoryModel.query()
      .where('boatId', boatId)
      .preload('spot', (q) =>
        q
          .preload('pontoon', (pq) => pq.preload('port'))
          .preload('mouillage', (mq) => mq.preload('port'))
      )
      .orderBy('startedAt', 'desc')
      .limit(20)
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
}
