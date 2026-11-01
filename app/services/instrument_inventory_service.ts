import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import BoatInstrumentDevice from '#models/boat_instrument_device'
import BoatInstrumentSource from '#models/boat_instrument_source'
import {
  InstrumentSourceDisabledError,
  InstrumentSourceNotFoundError,
  InventoryDuplicateDeviceError,
} from '#exceptions/instrument_errors'
import {
  INSTRUMENT_INVENTORY_GONE_GRACE_MINUTES,
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
 * mais absent du lot **et non vu depuis `INSTRUMENT_INVENTORY_GONE_GRACE_MINUTES`**
 * est marqué disparu : un lot vide ou partiel (Signal K qui redémarre) n'efface
 * rien tant que le délai de grâce court. Aucune donnée du lot n'est journalisée
 * (numéros de série).
 *
 * La ligne de la source est verrouillée en tête de transaction : deux envois
 * simultanés (le plugin qui rejoue après un délai dépassé) sont sérialisés, y
 * compris pour le tout premier lot où aucun appareil n'existe encore à verrouiller.
 * Une source désactivée refuse le lot, comme l'ingestion.
 */
export default class InstrumentInventoryService {
  async sync(
    source: Pick<BoatInstrumentSource, 'id'>,
    payload: InstrumentInventoryPayload,
    now: DateTime = DateTime.now()
  ): Promise<InstrumentInventoryResult> {
    this.validate(payload)

    return db.transaction(async (trx) => {
      const locked = await BoatInstrumentSource.query({ client: trx })
        .where('id', source.id)
        .forUpdate()
        .first()
      if (!locked) throw new InstrumentSourceNotFoundError()
      if (!locked.enabled) throw new InstrumentSourceDisabledError()

      const existing = await BoatInstrumentDevice.query({ client: trx })
        .where('sourceId', source.id)
        .forUpdate()
      const byId = new Map(existing.map((device) => [device.deviceId, device]))
      const result: InstrumentInventoryResult = { created: 0, updated: 0, gone: 0 }
      const unchanged: number[] = []
      const fresh: Array<Partial<BoatInstrumentDevice>> = []

      for (const input of payload.devices) {
        const known = byId.get(input.deviceId)
        if (!known) {
          fresh.push({
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
          })
          result.created++
          continue
        }
        result.updated++
        // Champ absent = valeur conservée ; `null` explicite = valeur effacée
        // (le plugin qui passe en mode « masquer » efface le numéro de série).
        known.merge({
          label: input.label,
          manufacturer: input.manufacturer === undefined ? known.manufacturer : input.manufacturer,
          model: input.model === undefined ? known.model : input.model,
          serialNumber: input.serialNumber === undefined ? known.serialNumber : input.serialNumber,
          function: input.function === undefined ? known.function : input.function,
          bus: input.bus,
          address: input.address === undefined ? known.address : input.address,
          paths: mergePaths(known.paths, input.paths),
          goneAt: null,
        })
        if (known.$isDirty) {
          known.useTransaction(trx)
          known.lastSeenAt = now
          await known.save()
        } else {
          unchanged.push(known.id)
        }
      }

      // Un lot de routine ne change que `last_seen_at` : une requête pour tous.
      if (unchanged.length > 0) {
        await BoatInstrumentDevice.query({ client: trx })
          .whereIn('id', unchanged)
          .update({ lastSeenAt: now.toSQL()! })
      }
      if (fresh.length > 0) await BoatInstrumentDevice.createMany(fresh, { client: trx })

      const graceLimit = now.minus({ minutes: INSTRUMENT_INVENTORY_GONE_GRACE_MINUTES })
      const announced = new Set(payload.devices.map((device) => device.deviceId))
      const vanished = existing
        .filter(
          (device) =>
            !announced.has(device.deviceId) &&
            device.goneAt === null &&
            device.lastSeenAt <= graceLimit
        )
        .map((device) => device.id)
      if (vanished.length > 0) {
        await BoatInstrumentDevice.query({ client: trx })
          .whereIn('id', vanished)
          .update({ goneAt: now.toSQL()! })
      }
      result.gone = vanished.length
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
 * Union dédoublonnée et triée. Les chemins hors catalogue sont écartés (ils
 * n'auraient aucune jauge) sans refuser le lot. La borne garde en priorité les
 * chemins du lot courant, puis les plus anciens connus : un appareil bavard ne
 * chasse pas ce que le plugin vient d'annoncer. Les chemins sont **cumulatifs**
 * par contrat (le plugin n'envoie que ce qu'il a vu ; un appareil qui change
 * d'instance garde l'ancien chemin).
 */
export function mergePaths(known: string[], incoming: string[]): string[] {
  const valid = incoming.filter((path) => telemetryPathSpec(path) !== null)
  return [...new Set([...valid, ...known])]
    .slice(0, INSTRUMENT_INVENTORY_MAX_PATHS_PER_DEVICE)
    .sort()
}
