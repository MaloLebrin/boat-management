import { BoatEquipmentNotFoundError } from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import BoatEnginePart from '#models/boat_engine_part'
import type Organization from '#models/organization'
import type User from '#models/user'
import { CloudinaryFolders } from '#services/cloudinary_service'
import MediaService from '#services/media_service'
import { LOW_STOCK_CAP } from '#shared/constants/dashboard_widgets'
import type { BoatEnginePartPayload, PartWearState } from '#shared/types/boat'
import type { DashboardLowStockParts } from '#shared/types/dashboard'
import { assertBoatInUserOrg, toDateOrNull, toDecimalStringOrNull } from '#utils/boat_utils'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'

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
      .whereRaw('stock <= min_stock_alert')
      .orderBy('designation', 'asc')
  }

  /**
   * Widget « Pièces manquantes » : pièces de toute la flotte sous leur seuil
   * d'alerte (`stock <= min_stock_alert`, seuil renseigné) ou à remplacer
   * (`wear_state` `to_replace` / `damaged`). Une requête : compteurs exacts par
   * fonctions fenêtre, lignes plafonnées, ruptures d'abord. Jamais `null` (#478).
   */
  async listAlertsForBoats(
    boatIds: number[],
    limit: number = LOW_STOCK_CAP
  ): Promise<DashboardLowStockParts> {
    const empty: DashboardLowStockParts = {
      items: [],
      total: 0,
      lowStockCount: 0,
      toReplaceCount: 0,
    }
    if (boatIds.length === 0) return empty

    const lowStock =
      'boat_engine_parts.min_stock_alert is not null and boat_engine_parts.stock <= boat_engine_parts.min_stock_alert'
    const toReplace = "boat_engine_parts.wear_state in ('to_replace', 'damaged')"

    const rows = await BoatEnginePart.query()
      .join('boat_engines', 'boat_engines.id', 'boat_engine_parts.boat_engine_id')
      .whereIn('boat_engines.boat_id', boatIds)
      .where((q) => {
        q.whereRaw(lowStock).orWhereRaw(toReplace)
      })
      .select('boat_engine_parts.*')
      .select(db.raw('count(*) over() as window_total'))
      .select(db.raw(`sum(case when ${lowStock} then 1 else 0 end) over() as low_stock_total`))
      .select(db.raw(`sum(case when ${toReplace} then 1 else 0 end) over() as to_replace_total`))
      .select(db.raw(`case when ${lowStock} then 0 else 1 end as alert_rank`))
      .preload('engine', (q) =>
        q
          .select(['id', 'boatId', 'brand', 'model', 'kind'])
          .preload('boat', (b) => b.select(['id', 'name']))
      )
      .orderBy('alert_rank', 'asc')
      .orderBy('boat_engine_parts.designation', 'asc')
      .orderBy('boat_engine_parts.id', 'asc')
      .limit(limit)

    const first = rows[0]?.$extras
    return {
      total: Number(first?.window_total ?? 0),
      lowStockCount: Number(first?.low_stock_total ?? 0),
      toReplaceCount: Number(first?.to_replace_total ?? 0),
      items: rows.map((part) => ({
        id: part.id,
        boatId: part.engine.boatId,
        boatName: part.engine.boat?.name ?? `#${part.engine.boatId}`,
        engineId: part.boatEngineId,
        engineBrand: part.engine.brand,
        engineModel: part.engine.model,
        engineKind: part.engine.kind,
        designation: part.designation,
        reference: part.reference,
        stock: part.stock,
        minStockAlert: part.minStockAlert,
        wearState: (part.wearState as PartWearState | null) ?? null,
        reason: Number(part.$extras.alert_rank) === 0 ? 'low_stock' : 'to_replace',
      })),
    }
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
      purchasePrice: toDecimalStringOrNull(payload.purchasePrice),
      purchasedAt: toDateOrNull(payload.purchasedAt),
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
    part.purchasePrice = toDecimalStringOrNull(payload.purchasePrice)
    part.purchasedAt = toDateOrNull(payload.purchasedAt)

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
        CloudinaryFolders.boatEnginePart(org.slug, boat.id, engineId, part.id),
        org
      )
    }

    await part.delete()
  }
}
