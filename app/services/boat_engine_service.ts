import { BoatEquipmentNotFoundError } from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import BoatEnginePart from '#models/boat_engine_part'
import type Organization from '#models/organization'
import type User from '#models/user'
import { CloudinaryFolders } from '#services/cloudinary_service'
import MediaService from '#services/media_service'
import { engineFamilyFromSignals } from '#shared/helpers/engine_family'
import type { BoatEnginePayload } from '#shared/types/boat'
import { assertBoatInUserOrg, toDateOrNull } from '#utils/boat_utils'
import { inject } from '@adonisjs/core'

export { BoatEquipmentNotFoundError }
export type { BoatEnginePayload }

@inject()
export default class BoatEngineService {
  constructor(private mediaService: MediaService) {}

  /**
   * Famille de motorisation (#574) : celle saisie, sinon la meilleure
   * déduction de `kind`/`fuel`/`strokeType`.
   *
   * Le formulaire propose la famille, il ne l'impose pas ; un moteur créé par
   * un import ou une API sans ce champ doit malgré tout arriver avec la même
   * valeur qu'un moteur backfillé par la migration — sans quoi la nomenclature
   * de pièces dépendrait de la porte d'entrée.
   */
  private resolveFamily(payload: BoatEnginePayload): string | null {
    return payload.family ?? engineFamilyFromSignals(payload)
  }

  async create(user: User, boat: Boat, payload: BoatEnginePayload) {
    assertBoatInUserOrg(user, boat)

    return await BoatEngine.create({
      boatId: boat.id,
      kind: payload.kind,
      fuel: payload.fuel ?? null,
      strokeType: payload.strokeType ?? null,
      family: this.resolveFamily(payload),
      brand: payload.brand ?? null,
      model: payload.model ?? null,
      // Rattachement au catalogue (#573) : `brand`/`model` restent alimentés,
      // ce sont eux le repli texte libre.
      engineModelId: payload.engineModelId ?? null,
      serialNumber: payload.serialNumber ?? null,
      manufacturedAt: toDateOrNull(payload.manufacturedAt),
      powerHp: payload.powerHp ?? null,
      // `hours` (live running total) starts equal to `installHours` (fixed
      // baseline captured at creation) — afterward it only moves via
      // incrementHours() and navigation log closures, never via update().
      hours: payload.installHours ?? null,
      installHours: payload.installHours ?? null,
    })
  }

  async update(user: User, boat: Boat, engineId: number, payload: BoatEnginePayload) {
    assertBoatInUserOrg(user, boat)

    const engine = await BoatEngine.query().where('id', engineId).where('boatId', boat.id).first()
    if (!engine) throw new BoatEquipmentNotFoundError()

    // `hours` and `installHours` are intentionally not editable here: the
    // install baseline is fixed once at creation, and the running total only
    // moves via incrementHours() or a navigation log closure.
    engine.kind = payload.kind
    engine.fuel = payload.fuel ?? null
    engine.strokeType = payload.strokeType ?? null
    engine.family = this.resolveFamily(payload)
    engine.brand = payload.brand ?? null
    engine.model = payload.model ?? null
    engine.engineModelId = payload.engineModelId ?? null
    engine.serialNumber = payload.serialNumber ?? null
    engine.manufacturedAt = toDateOrNull(payload.manufacturedAt)
    engine.powerHp = payload.powerHp ?? null

    await engine.save()
    return engine
  }

  async delete(user: User, boat: Boat, engineId: number, org?: Organization) {
    assertBoatInUserOrg(user, boat)

    const engine = await BoatEngine.query().where('id', engineId).where('boatId', boat.id).first()
    if (!engine) throw new BoatEquipmentNotFoundError()

    if (org) {
      const parts = await BoatEnginePart.query().where('boatEngineId', engineId).select('id')
      for (const part of parts) {
        await this.mediaService.deleteAllForEntity(
          'boat_engine_part',
          part.id,
          CloudinaryFolders.boatEnginePart(org.slug, boat.id, engineId, part.id),
          org
        )
      }
      await this.mediaService.deleteAllForEntity(
        'boat_engine',
        engineId,
        CloudinaryFolders.boatEngine(org.slug, boat.id, engineId),
        org
      )
    }

    await engine.delete()
  }

  async updateStatus(user: User, boat: Boat, engineId: number, status: string) {
    assertBoatInUserOrg(user, boat)

    const engine = await BoatEngine.query().where('id', engineId).where('boatId', boat.id).first()
    if (!engine) throw new BoatEquipmentNotFoundError()

    engine.status = status
    await engine.save()
  }

  async updateNotes(user: User, boat: Boat, engineId: number, notes: string | null) {
    assertBoatInUserOrg(user, boat)

    const engine = await BoatEngine.query().where('id', engineId).where('boatId', boat.id).first()
    if (!engine) throw new BoatEquipmentNotFoundError()

    engine.notes = notes
    await engine.save()
  }

  async incrementHours(user: User, boat: Boat, engineId: number, incrementBy: number) {
    assertBoatInUserOrg(user, boat)

    const engine = await BoatEngine.query().where('id', engineId).where('boatId', boat.id).first()
    if (!engine) throw new BoatEquipmentNotFoundError()

    engine.hours = (engine.hours ?? 0) + Math.round(incrementBy)
    await engine.save()
    return engine
  }
}
