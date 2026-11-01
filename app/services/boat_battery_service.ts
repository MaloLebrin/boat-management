import {
  BoatBatteryInstrumentKeyTakenError,
  BoatEquipmentNotFoundError,
} from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import BoatBattery from '#models/boat_battery'
import type User from '#models/user'
import InstrumentEntityAlertService from '#services/instrument_entity_alert_service'
import type { BoatBatteryPayload } from '#shared/types/boat'
import { assertBoatInUserOrg } from '#utils/boat_utils'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'

/**
 * Batteries d'un bateau (#1037) — même patron que `boat_engine_service.ts` :
 * `instrumentKey` (`<id>` de `electrical.batteries.<id>.*`) désigne une batterie
 * de façon unique sur un bateau. Le seuil de tension basse crée la règle
 * d'alerte liée (`instrument_entity_alert_service.ts`), dans la même transaction.
 */
@inject()
export default class BoatBatteryService {
  constructor(private entityAlerts: InstrumentEntityAlertService) {}

  async list(boat: Pick<Boat, 'id'>): Promise<BoatBattery[]> {
    return BoatBattery.query().where('boatId', boat.id).orderBy('position').orderBy('id')
  }

  private async assertKeyFree(boatId: number, key: string | null, exceptId?: number) {
    if (key === null) return
    const query = BoatBattery.query().where('boatId', boatId).where('instrumentKey', key)
    if (exceptId !== undefined) query.whereNot('id', exceptId)
    if (await query.first()) throw new BoatBatteryInstrumentKeyTakenError()
  }

  private async find(boat: Boat, id: number): Promise<BoatBattery> {
    const battery = await BoatBattery.query().where('id', id).where('boatId', boat.id).first()
    if (!battery) throw new BoatEquipmentNotFoundError()
    return battery
  }

  async create(user: User, boat: Boat, payload: BoatBatteryPayload): Promise<BoatBattery> {
    assertBoatInUserOrg(user, boat)
    const key = normalizeKey(payload.instrumentKey)
    await this.assertKeyFree(boat.id, key)

    return db.transaction(async (trx) => {
      const last = await BoatBattery.query({ client: trx })
        .where('boatId', boat.id)
        .max('position as max')
      const battery = await BoatBattery.create(
        {
          boatId: boat.id,
          name: payload.name,
          chemistry: payload.chemistry ?? null,
          capacityAh: payload.capacityAh ?? null,
          nominalVoltage: decimalOrNull(payload.nominalVoltage),
          lowVoltageV: decimalOrNull(payload.lowVoltageV),
          instrumentKey: key,
          position: Number(last[0].$extras.max ?? -1) + 1,
        },
        { client: trx }
      )
      await this.entityAlerts.syncBattery(boat, battery, trx)
      return battery
    })
  }

  async update(
    user: User,
    boat: Boat,
    batteryId: number,
    payload: BoatBatteryPayload
  ): Promise<BoatBattery> {
    assertBoatInUserOrg(user, boat)
    const battery = await this.find(boat, batteryId)
    const key = normalizeKey(payload.instrumentKey)
    await this.assertKeyFree(boat.id, key, battery.id)

    return db.transaction(async (trx) => {
      battery.useTransaction(trx)
      battery.merge({
        name: payload.name,
        chemistry: payload.chemistry ?? null,
        capacityAh: payload.capacityAh ?? null,
        nominalVoltage: decimalOrNull(payload.nominalVoltage),
        lowVoltageV: decimalOrNull(payload.lowVoltageV),
        instrumentKey: key,
      })
      await battery.save()
      await this.entityAlerts.syncBattery(boat, battery, trx)
      return battery
    })
  }

  /** Relie (ou détache, avec `null`) une batterie à son identifiant Signal K. */
  async setInstrumentKey(
    user: User,
    boat: Boat,
    batteryId: number,
    key: string | null
  ): Promise<BoatBattery> {
    assertBoatInUserOrg(user, boat)
    const battery = await this.find(boat, batteryId)
    const normalized = normalizeKey(key)
    await this.assertKeyFree(boat.id, normalized, battery.id)

    return db.transaction(async (trx) => {
      battery.useTransaction(trx)
      battery.instrumentKey = normalized
      await battery.save()
      await this.entityAlerts.syncBattery(boat, battery, trx)
      return battery
    })
  }

  async delete(user: User, boat: Boat, batteryId: number): Promise<void> {
    assertBoatInUserOrg(user, boat)
    const battery = await this.find(boat, batteryId)
    // La règle liée part avec la batterie (clé étrangère `ON DELETE CASCADE`).
    await battery.delete()
  }
}

function normalizeKey(key: string | null | undefined): string | null {
  const trimmed = key?.trim()
  return trimmed ? trimmed : null
}

function decimalOrNull(value: number | null | undefined): string | null {
  return value === null || value === undefined ? null : String(value)
}
