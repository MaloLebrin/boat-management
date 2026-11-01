import { InstrumentMappingConflictError } from '#exceptions/instrument_errors'
import type Boat from '#models/boat'
import BoatBattery from '#models/boat_battery'
import BoatEngine from '#models/boat_engine'
import BoatTank from '#models/boat_tank'
import type User from '#models/user'
import InstrumentEntityAlertService from '#services/instrument_entity_alert_service'
import { BATTERY_KEY_PATTERN, isTankType, TANK_KEY_PATTERN } from '#shared/constants/tanks'
import type {
  InstrumentMappingApplyPayload,
  InstrumentMappingApplyResult,
} from '#shared/types/instruments'
import { assertBoatInUserOrg } from '#utils/boat_utils'
import { inject } from '@adonisjs/core'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import db from '@adonisjs/lucid/services/db'

type Item = InstrumentMappingApplyPayload['items'][number]

/**
 * Applique les propositions cochées (#1037), **en une transaction** : la
 * première qui ne peut pas l'être (clé prise, équipement disparu ou déjà relié
 * à autre chose, type de cuve inconnu) annule tout — jamais de rattachement à
 * moitié. Un moteur se relie, il ne se crée pas ; une batterie ou une cuve se
 * relie si `existingId` est fourni, sinon elle est créée.
 */
@inject()
export default class InstrumentMappingApplyService {
  constructor(private entityAlerts: InstrumentEntityAlertService) {}

  async apply(
    user: User,
    boat: Boat,
    payload: InstrumentMappingApplyPayload
  ): Promise<InstrumentMappingApplyResult> {
    assertBoatInUserOrg(user, boat)

    const seen = new Set<string>()
    for (const item of payload.items) {
      const id = `${item.kind}:${item.instrumentKey}`
      if (seen.has(id)) throw new InstrumentMappingConflictError(item.instrumentKey)
      seen.add(id)
    }

    return db.transaction(async (trx) => {
      const result: InstrumentMappingApplyResult = { linked: 0, created: 0 }
      for (const item of payload.items) {
        const created = await this.applyOne(boat, item, trx)
        if (created) result.created++
        else result.linked++
      }
      return result
    })
  }

  /** `true` si l'équipement a été créé, `false` s'il a été relié. */
  private async applyOne(boat: Boat, item: Item, trx: TransactionClientContract): Promise<boolean> {
    if (item.kind === 'engine') return this.applyEngine(boat, item, trx)
    if (item.kind === 'battery') return this.applyBattery(boat, item, trx)
    return this.applyTank(boat, item, trx)
  }

  private async applyEngine(boat: Boat, item: Item, trx: TransactionClientContract) {
    if (item.existingId === null) throw new InstrumentMappingConflictError(item.instrumentKey)
    const engine = await BoatEngine.query({ client: trx })
      .where('id', item.existingId)
      .where('boatId', boat.id)
      .forUpdate()
      .first()
    if (!engine || engine.instrumentKey !== null) {
      throw new InstrumentMappingConflictError(item.instrumentKey)
    }
    const taken = await BoatEngine.query({ client: trx })
      .where('boatId', boat.id)
      .where('instrumentKey', item.instrumentKey)
      .first()
    if (taken) throw new InstrumentMappingConflictError(item.instrumentKey)

    // Un autre calculateur : l'ancienne base de `runTime` ne vaut plus rien (#991, D6).
    engine.instrumentRunTimeS = null
    engine.instrumentKey = item.instrumentKey
    await engine.save()
    return false
  }

  private async applyBattery(boat: Boat, item: Item, trx: TransactionClientContract) {
    if (!BATTERY_KEY_PATTERN.test(item.instrumentKey)) {
      throw new InstrumentMappingConflictError(item.instrumentKey)
    }
    const taken = await BoatBattery.query({ client: trx })
      .where('boatId', boat.id)
      .where('instrumentKey', item.instrumentKey)
      .first()
    if (taken) throw new InstrumentMappingConflictError(item.instrumentKey)

    let battery: BoatBattery
    if (item.existingId !== null) {
      const existing = await BoatBattery.query({ client: trx })
        .where('id', item.existingId)
        .where('boatId', boat.id)
        .forUpdate()
        .first()
      if (!existing || existing.instrumentKey !== null) {
        throw new InstrumentMappingConflictError(item.instrumentKey)
      }
      battery = existing
      battery.instrumentKey = item.instrumentKey
      await battery.save()
    } else {
      const last = await BoatBattery.query({ client: trx })
        .where('boatId', boat.id)
        .max('position as max')
      battery = await BoatBattery.create(
        {
          boatId: boat.id,
          name: item.name,
          instrumentKey: item.instrumentKey,
          position: Number(last[0].$extras.max ?? -1) + 1,
        },
        { client: trx }
      )
    }
    await this.entityAlerts.syncBattery(boat, battery, trx)
    return item.existingId === null
  }

  private async applyTank(boat: Boat, item: Item, trx: TransactionClientContract) {
    const type = item.tankType
    if (
      !isTankType(type) ||
      !TANK_KEY_PATTERN.test(item.instrumentKey) ||
      item.instrumentKey.split('.')[0] !== type
    ) {
      throw new InstrumentMappingConflictError(item.instrumentKey)
    }
    const taken = await BoatTank.query({ client: trx })
      .where('boatId', boat.id)
      .where('instrumentKey', item.instrumentKey)
      .first()
    if (taken) throw new InstrumentMappingConflictError(item.instrumentKey)

    let tank: BoatTank
    if (item.existingId !== null) {
      const existing = await BoatTank.query({ client: trx })
        .where('id', item.existingId)
        .where('boatId', boat.id)
        .forUpdate()
        .first()
      if (!existing || existing.instrumentKey !== null || existing.type !== type) {
        throw new InstrumentMappingConflictError(item.instrumentKey)
      }
      tank = existing
      tank.instrumentKey = item.instrumentKey
      await tank.save()
    } else {
      tank = await BoatTank.create(
        { boatId: boat.id, name: item.name, type, instrumentKey: item.instrumentKey },
        { client: trx }
      )
    }
    await this.entityAlerts.syncTank(boat, tank, trx)
    return item.existingId === null
  }
}
