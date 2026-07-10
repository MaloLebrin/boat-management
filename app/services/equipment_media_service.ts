import type Boat from '#models/boat'
import BoatEnginePartService from '#services/boat_engine_part_service'
import BoatGenericEquipmentService from '#services/boat_generic_equipment_service'
import BoatSafetyEquipmentService from '#services/boat_safety_equipment_service'
import { CloudinaryFolders } from '#services/cloudinary_service'
import type {
  EquipmentMediaResolution,
  EquipmentMediaSlug,
  ResolvedEquipmentMedia,
} from '#shared/types/equipment_media'
import { inject } from '@adonisjs/core'

function ok(resolved: ResolvedEquipmentMedia): EquipmentMediaResolution {
  return { ok: true, resolved }
}

function fail(redirectTo: string): EquipmentMediaResolution {
  return { ok: false, redirectTo }
}

/**
 * Resolves an equipment photo target from route params.
 *
 * Every branch re-verifies that the equipment belongs to the boat that was
 * already scoped to the caller's organization. This is the IDOR guard: a
 * forged `engineId` / `sailId` / `itemId` from another boat resolves to
 * `ok: false` and the caller must redirect without touching any media.
 */
@inject()
export default class EquipmentMediaService {
  constructor(
    private enginePartService: BoatEnginePartService,
    private genericEquipmentService: BoatGenericEquipmentService,
    private safetyEquipmentService: BoatSafetyEquipmentService
  ) {}

  async resolve(
    slug: EquipmentMediaSlug,
    boat: Boat,
    params: Record<string, string>,
    orgSlug: string
  ): Promise<EquipmentMediaResolution> {
    switch (slug) {
      case 'engine':
        return this.resolveEngine(boat, params, orgSlug)
      case 'engine-part':
        return this.resolveEnginePart(boat, params, orgSlug)
      case 'sail':
        return this.resolveSail(boat, params, orgSlug)
      case 'rig':
        return this.resolveRig(boat, orgSlug)
      case 'generic':
        return this.resolveGeneric(boat, params, orgSlug)
      case 'safety':
        return this.resolveSafety(boat, params, orgSlug)
    }
  }

  private resolveEngine(
    boat: Boat,
    params: Record<string, string>,
    orgSlug: string
  ): EquipmentMediaResolution {
    const engineId = Number(params.engineId)
    const engine = boat.engines.find((e) => e.id === engineId)
    if (!engine) return fail(`/boats/${boat.id}`)

    return ok({
      entityType: 'boat_engine',
      entityId: engine.id,
      photoFolder: CloudinaryFolders.boatEnginePhotos(orgSlug, boat.id, engine.id),
      photosUrl: `/boats/${boat.id}/engines/${engine.id}?tab=photos`,
    })
  }

  private async resolveEnginePart(
    boat: Boat,
    params: Record<string, string>,
    orgSlug: string
  ): Promise<EquipmentMediaResolution> {
    const engineId = Number(params.engineId)
    const engine = boat.engines.find((e) => e.id === engineId)
    if (!engine) return fail(`/boats/${boat.id}`)

    const partId = Number(params.partId)
    const part = await this.enginePartService.findForEngine(engine.id, partId)
    if (!part) return fail(`/boats/${boat.id}/engines/${engine.id}?tab=parts`)

    return ok({
      entityType: 'boat_engine_part',
      entityId: part.id,
      photoFolder: CloudinaryFolders.boatEnginePartPhotos(orgSlug, boat.id, engine.id, part.id),
      photosUrl: `/boats/${boat.id}/engines/${engine.id}/parts/${part.id}?tab=photos`,
    })
  }

  private resolveSail(
    boat: Boat,
    params: Record<string, string>,
    orgSlug: string
  ): EquipmentMediaResolution {
    const sailId = Number(params.sailId)
    const sail = boat.sails.find((s) => s.id === sailId)
    if (!sail) return fail(`/boats/${boat.id}`)

    return ok({
      entityType: 'boat_sail',
      entityId: sail.id,
      photoFolder: CloudinaryFolders.boatSailPhotos(orgSlug, boat.id, sail.id),
      photosUrl: `/boats/${boat.id}/sails/${sail.id}?tab=photos`,
    })
  }

  private resolveRig(boat: Boat, orgSlug: string): EquipmentMediaResolution {
    const rig = boat.rig
    if (!rig) return fail(`/boats/${boat.id}`)

    return ok({
      entityType: 'boat_rig',
      entityId: rig.id,
      photoFolder: CloudinaryFolders.boatRigPhotos(orgSlug, boat.id),
      photosUrl: `/boats/${boat.id}/rig?tab=photos`,
    })
  }

  private async resolveGeneric(
    boat: Boat,
    params: Record<string, string>,
    orgSlug: string
  ): Promise<EquipmentMediaResolution> {
    const itemId = Number(params.genericId)
    const item = await this.genericEquipmentService.findForBoat(boat.id, itemId)
    if (!item) return fail(`/boats/${boat.id}?tab=equipment`)

    return ok({
      entityType: 'boat_generic_equipment',
      entityId: item.id,
      photoFolder: CloudinaryFolders.boatGenericEquipmentPhotos(orgSlug, boat.id, item.id),
      photosUrl: `/boats/${boat.id}/generic-equipment/${item.id}?tab=photos`,
    })
  }

  private async resolveSafety(
    boat: Boat,
    params: Record<string, string>,
    orgSlug: string
  ): Promise<EquipmentMediaResolution> {
    const itemId = Number(params.safetyId)
    const item = await this.safetyEquipmentService.findForBoat(boat.id, itemId)
    if (!item) return fail(`/boats/${boat.id}?tab=equipment`)

    return ok({
      entityType: 'boat_safety_equipment',
      entityId: item.id,
      photoFolder: CloudinaryFolders.boatSafetyEquipmentPhotos(orgSlug, boat.id, item.id),
      photosUrl: `/boats/${boat.id}/safety-equipment/${item.id}?tab=photos`,
    })
  }
}
