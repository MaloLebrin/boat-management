import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import BoatInstrumentDevice from '#models/boat_instrument_device'
import type BoatInstrumentSource from '#models/boat_instrument_source'
import { InventoryDuplicateDeviceError } from '#exceptions/instrument_errors'
import {
  INSTRUMENT_INVENTORY_MAX_PATHS_PER_DEVICE,
  telemetryPathSpec,
} from '#shared/constants/instruments'
import type {
  InstrumentInventoryPayload,
  InstrumentInventoryResult,
} from '#shared/types/instruments'

/**
 * Inventaire des appareils du bus (#1036). Le plugin envoie l'état complet de
 * ce qu'il connaît : chaque appareil du lot est créé ou mis à jour (chemins du
 * catalogue **fusionnés** avec ceux déjà connus, `gone_at` effacé), chaque appareil connu
 * mais absent du lot est marqué disparu. Aucune donnée du lot n'est journalisée
 * (numéros de série).
 */
export default class InstrumentInventoryService {
  async sync(
    source: Pick<BoatInstrumentSource, 'id'>,
    payload: InstrumentInventoryPayload,
    now: DateTime = DateTime.now()
  ): Promise<InstrumentInventoryResult> {
    this.validate(payload)

    return db.transaction(async (trx) => {
      const existing = await BoatInstrumentDevice.query({ client: trx })
        .where('sourceId', source.id)
        .forUpdate()
      const byId = new Map(existing.map((device) => [device.deviceId, device]))
      const result: InstrumentInventoryResult = { created: 0, updated: 0, gone: 0 }

      for (const input of payload.devices) {
        const known = byId.get(input.deviceId)
        if (known) {
          known.merge({
            label: input.label,
            manufacturer: input.manufacturer ?? known.manufacturer,
            model: input.model ?? known.model,
            serialNumber: input.serialNumber ?? known.serialNumber,
            function: input.function ?? known.function,
            bus: input.bus,
            address: input.address ?? known.address,
            paths: mergePaths(known.paths, input.paths),
            lastSeenAt: now,
            goneAt: null,
          })
          known.useTransaction(trx)
          await known.save()
          result.updated++
          continue
        }
        await BoatInstrumentDevice.create(
          {
            sourceId: source.id,
            deviceId: input.deviceId,
            label: input.label,
            manufacturer: input.manufacturer ?? null,
            model: input.model ?? null,
            serialNumber: input.serialNumber ?? null,
            function: input.function ?? null,
            bus: input.bus,
            address: input.address ?? null,
            paths: mergePaths([], input.paths),
            firstSeenAt: now,
            lastSeenAt: now,
            goneAt: null,
          },
          { client: trx }
        )
        result.created++
      }

      const announced = new Set(payload.devices.map((device) => device.deviceId))
      for (const device of existing) {
        if (announced.has(device.deviceId) || device.goneAt !== null) continue
        device.useTransaction(trx)
        device.goneAt = now
        await device.save()
        result.gone++
      }
      return result
    })
  }

  /** Appareils d'un bateau : présents d'abord, puis disparus, du plus récemment vu au plus ancien. */
  async listForSource(source: Pick<BoatInstrumentSource, 'id'>): Promise<BoatInstrumentDevice[]> {
    return BoatInstrumentDevice.query()
      .where('sourceId', source.id)
      .orderByRaw('gone_at IS NOT NULL')
      .orderBy('lastSeenAt', 'desc')
      .orderBy('id', 'asc')
  }

  private validate(payload: InstrumentInventoryPayload): void {
    const seen = new Set<string>()
    for (const device of payload.devices) {
      if (seen.has(device.deviceId)) throw new InventoryDuplicateDeviceError(device.deviceId)
      seen.add(device.deviceId)
    }
  }
}

/**
 * Union triée et dédoublonnée, bornée : un appareil bavard ne gonfle pas la
 * ligne. Les chemins hors catalogue sont écartés (ils n'auraient aucune
 * jauge) sans refuser le lot.
 */
export function mergePaths(known: string[], incoming: string[]): string[] {
  return [...new Set([...known, ...incoming.filter((path) => telemetryPathSpec(path) !== null)])]
    .sort()
    .slice(0, INSTRUMENT_INVENTORY_MAX_PATHS_PER_DEVICE)
}
