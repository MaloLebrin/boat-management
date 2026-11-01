import {
  BoatTankInstrumentKeyTakenError,
  BoatEquipmentNotFoundError,
} from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import BoatTank from '#models/boat_tank'
import type User from '#models/user'
import InstrumentEntityAlertService from '#services/instrument_entity_alert_service'
import type { BoatTankPayload } from '#shared/types/boat'
import { assertBoatInUserOrg } from '#utils/boat_utils'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'

/**
 * Réservoirs d'un bateau (#1037) — même patron que `boat_engine_service.ts` :
 * `instrumentKey` (`<type>.<id>` de `tanks.<type>.<id>.*`) désigne une cuve
 * de façon unique sur un bateau. Le seuil de niveau bas crée la règle
 * d'alerte liée (`instrument_entity_alert_service.ts`), dans la même transaction.
 */
@inject()
export default class BoatTankService {
  constructor(private entityAlerts: InstrumentEntityAlertService) {}

  async list(boat: Pick<Boat, 'id'>): Promise<BoatTank[]> {
    return BoatTank.query().where('boatId', boat.id).orderBy('type').orderBy('id')
  }

  private async assertKeyFree(boatId: number, key: string | null, exceptId?: number) {
    if (key === null) return
    const query = BoatTank.query().where('boatId', boatId).where('instrumentKey', key)
    if (exceptId !== undefined) query.whereNot('id', exceptId)
    if (await query.first()) throw new BoatTankInstrumentKeyTakenError()
  }

  private async find(boat: Boat, id: number): Promise<BoatTank> {
    const tank = await BoatTank.query().where('id', id).where('boatId', boat.id).first()
    if (!tank) throw new BoatEquipmentNotFoundError()
    return tank
  }

  async create(user: User, boat: Boat, payload: BoatTankPayload): Promise<BoatTank> {
    assertBoatInUserOrg(user, boat)
    const key = normalizeKey(payload.instrumentKey)
    await this.assertKeyFree(boat.id, key)

    return db.transaction(async (trx) => {
      const tank = await BoatTank.create(
        {
          boatId: boat.id,
          name: payload.name,
          type: payload.type,
          capacityL: payload.capacityL ?? null,
          lowLevelPct: payload.lowLevelPct ?? null,
          instrumentKey: key,
        },
        { client: trx }
      )
      await this.entityAlerts.syncTank(boat, tank, trx)
      return tank
    })
  }

  async update(
    user: User,
    boat: Boat,
    tankId: number,
    payload: BoatTankPayload
  ): Promise<BoatTank> {
    assertBoatInUserOrg(user, boat)
    const tank = await this.find(boat, tankId)
    const key = normalizeKey(payload.instrumentKey)
    await this.assertKeyFree(boat.id, key, tank.id)

    return db.transaction(async (trx) => {
      tank.useTransaction(trx)
      tank.merge({
        name: payload.name,
        type: payload.type,
        capacityL: payload.capacityL ?? null,
        lowLevelPct: payload.lowLevelPct ?? null,
        instrumentKey: key,
      })
      await tank.save()
      await this.entityAlerts.syncTank(boat, tank, trx)
      return tank
    })
  }

  /** Relie (ou détache, avec `null`) une cuve à son identifiant Signal K. */
  async setInstrumentKey(
    user: User,
    boat: Boat,
    tankId: number,
    key: string | null
  ): Promise<BoatTank> {
    assertBoatInUserOrg(user, boat)
    const tank = await this.find(boat, tankId)
    const normalized = normalizeKey(key)
    await this.assertKeyFree(boat.id, normalized, tank.id)

    return db.transaction(async (trx) => {
      tank.useTransaction(trx)
      tank.instrumentKey = normalized
      await tank.save()
      await this.entityAlerts.syncTank(boat, tank, trx)
      return tank
    })
  }

  async delete(user: User, boat: Boat, tankId: number): Promise<void> {
    assertBoatInUserOrg(user, boat)
    const tank = await this.find(boat, tankId)
    // La règle liée part avec la cuve (clé étrangère `ON DELETE CASCADE`).
    await tank.delete()
  }
}

function normalizeKey(key: string | null | undefined): string | null {
  const trimmed = key?.trim()
  return trimmed ? trimmed : null
}
