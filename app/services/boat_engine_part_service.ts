import { BoatEquipmentNotFoundError } from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import BoatEnginePart from '#models/boat_engine_part'
import type Organization from '#models/organization'
import type User from '#models/user'
import { CloudinaryFolders } from '#services/cloudinary_service'
import MediaService from '#services/media_service'
import type { BoatEnginePartPayload } from '#shared/types/boat'
import { assertBoatInUserOrg } from '#utils/boat_utils'
import { inject } from '@adonisjs/core'

export { BoatEquipmentNotFoundError }
export type { BoatEnginePartPayload }

@inject()
export default class BoatEnginePartService {
  constructor(private mediaService: MediaService) {}

  async listForEngine(engineId: number) {
    return await BoatEnginePart.query().where('boatEngineId', engineId).orderBy('id', 'asc')
  }

  async findForEngine(engineId: number, partId: number) {
    return await BoatEnginePart.query().where('id', partId).where('boatEngineId', engineId).first()
  }

  /**
   * Returns parts whose stock is at or below their minStockAlert threshold.
   * Only returns parts where minStockAlert is set (non-null).
   */
  async listLowStock(engineId: number) {
    return await BoatEnginePart.query()
      .where('boatEngineId', engineId)
      .whereNotNull('minStockAlert')
      .whereRaw('(stock IS NULL OR stock <= min_stock_alert)')
      .orderBy('designation', 'asc')
  }

  async create(user: User, boat: Boat, engineId: number, payload: BoatEnginePartPayload) {
    assertBoatInUserOrg(user, boat)

    const engine = boat.engines.find((e) => e.id === engineId)
    if (!engine) throw new BoatEquipmentNotFoundError()

    return await BoatEnginePart.create({
      boatEngineId: engineId,
      designation: payload.designation,
      reference: payload.reference ?? null,
      stock: payload.stock ?? null,
      minStockAlert: payload.minStockAlert ?? null,
      supplier: payload.supplier ?? null,
      notes: payload.notes ?? null,
      wearState: payload.wearState ?? null,
    })
  }

  async update(
    user: User,
    boat: Boat,
    engineId: number,
    partId: number,
    payload: BoatEnginePartPayload
  ) {
    assertBoatInUserOrg(user, boat)

    const engine = boat.engines.find((e) => e.id === engineId)
    if (!engine) throw new BoatEquipmentNotFoundError()

    const part = await BoatEnginePart.query()
      .where('id', partId)
      .where('boatEngineId', engineId)
      .first()
    if (!part) throw new BoatEquipmentNotFoundError()

    part.designation = payload.designation
    part.reference = payload.reference ?? null
    part.stock = payload.stock ?? null
    part.minStockAlert = payload.minStockAlert ?? null
    part.supplier = payload.supplier ?? null
    part.notes = payload.notes ?? null
    part.wearState = payload.wearState ?? null

    await part.save()
    return part
  }

  async delete(user: User, boat: Boat, engineId: number, partId: number, org?: Organization) {
    assertBoatInUserOrg(user, boat)

    const engine = boat.engines.find((e) => e.id === engineId)
    if (!engine) throw new BoatEquipmentNotFoundError()

    const part = await BoatEnginePart.query()
      .where('id', partId)
      .where('boatEngineId', engineId)
      .first()
    if (!part) throw new BoatEquipmentNotFoundError()

    if (org) {
      await this.mediaService.deleteAllForEntity(
        'boat_engine_part',
        part.id,
        CloudinaryFolders.boatEnginePartDocuments(org.slug, boat.id, engineId, part.id),
        org
      )
    }

    await part.delete()
  }
}
