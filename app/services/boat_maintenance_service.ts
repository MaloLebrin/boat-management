import {
  BoatMaintenanceNotFoundError,
  BoatMaintenanceValidationError,
} from '#exceptions/maintenance_errors'
import type Boat from '#models/boat'
import type {
  CreateMaintenancePayload,
  MaintenanceBoatOption,
  MaintenanceEventRow,
  MaintenanceHistoryFilters,
  MaintenanceHistorySort,
  MaintenanceTaskSubject,
} from '#shared/types/maintenance'
import {
  buildEngineCaption,
  buildSailCaption,
  computeTotalCost,
  toDateTime,
} from '#shared/helpers/maintenance'
import {
  clampInt,
  escapeLike,
  normalizeEnum,
  toIntegerOrUndefined,
  toTrimmedStringOrUndefined,
} from '#shared/helpers/query'
import BoatEngine from '#models/boat_engine'
import BoatEnginePart from '#models/boat_engine_part'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import BoatMaintenancePart from '#models/boat_maintenance_part'
import BoatRig from '#models/boat_rig'
import BoatSafetyEquipment from '#models/boat_safety_equipment'
import BoatSail from '#models/boat_sail'
import type User from '#models/user'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'

export { BoatMaintenanceNotFoundError, BoatMaintenanceValidationError }
export type { CreateMaintenancePayload }

const VALID_HISTORY_SUBJECTS: readonly MaintenanceTaskSubject[] = [
  'boat',
  'hull',
  'engine',
  'sail',
  'rig',
  'electrical',
  'plumbing',
  'safety',
  'deck',
  'other',
]
const VALID_HISTORY_SORTS: readonly MaintenanceHistorySort[] = ['recent', 'oldest']
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Renvoie la date `yyyy-MM-dd` telle quelle si valide, sinon `''`. */
function normalizeIsoDate(value: unknown): string {
  const trimmed = toTrimmedStringOrUndefined(value)
  return trimmed && ISO_DATE_RE.test(trimmed) ? trimmed : ''
}

@inject()
export default class BoatMaintenanceService {
  async listForBoat(_user: User, boat: Boat) {
    return await BoatMaintenanceEvent.query()
      .where('boatId', boat.id)
      .preload('parts')
      .orderBy('performedAt', 'desc')
  }

  async createForBoat(user: User, boat: Boat, payload: CreateMaintenancePayload) {
    if (user.organizationId === null || user.organizationId !== boat.organizationId) {
      throw new BoatMaintenanceValidationError('Invalid boat', 'invalidBoat')
    }

    let boatEngineId: number | null = null
    let boatSailId: number | null = null
    let boatRigId: number | null = null
    let boatSafetyEquipmentId: number | null = null
    let engineCaption: string | null = null
    let sailCaption: string | null = null

    switch (payload.subject) {
      case 'boat':
      case 'hull':
      case 'electrical':
      case 'plumbing':
      case 'deck':
      case 'other':
        break
      case 'safety': {
        if (payload.boatSafetyEquipmentId) {
          const item = await BoatSafetyEquipment.query()
            .select('id')
            .where('id', payload.boatSafetyEquipmentId)
            .where('boatId', boat.id)
            .first()
          if (!item) {
            throw new BoatMaintenanceValidationError(
              'Safety equipment does not belong to this boat',
              'safetyEquipmentNotBelongs'
            )
          }
          boatSafetyEquipmentId = item.id
        }
        break
      }
      case 'engine': {
        let caption = payload.engineCaption?.trim() || null
        if (payload.boatEngineId) {
          const engine = await BoatEngine.query()
            .where('id', payload.boatEngineId)
            .where('boatId', boat.id)
            .first()
          if (!engine) {
            throw new BoatMaintenanceValidationError(
              'Engine does not belong to this boat',
              'engineNotBelongs'
            )
          }
          boatEngineId = engine.id
          if (!caption) caption = buildEngineCaption(engine)
        }
        if (!caption) {
          throw new BoatMaintenanceValidationError(
            'engineCaption is required for engine maintenance',
            'engineCaptionRequired'
          )
        }
        engineCaption = caption
        break
      }
      case 'sail': {
        let caption = payload.sailCaption?.trim() || null
        if (payload.boatSailId) {
          const sail = await BoatSail.query()
            .where('id', payload.boatSailId)
            .where('boatId', boat.id)
            .first()
          if (!sail) {
            throw new BoatMaintenanceValidationError(
              'Sail does not belong to this boat',
              'sailNotBelongs'
            )
          }
          boatSailId = sail.id
          if (!caption) caption = buildSailCaption(sail)
        }
        if (!caption) {
          throw new BoatMaintenanceValidationError(
            'sailCaption is required for sail maintenance',
            'sailCaptionRequired'
          )
        }
        sailCaption = caption
        break
      }
      case 'rig': {
        const rigId = payload.boatRigId
        if (!rigId) {
          throw new BoatMaintenanceValidationError(
            'boatRigId is required for rig maintenance',
            'rigIdRequired'
          )
        }
        const rig = await BoatRig.query().where('id', rigId).where('boatId', boat.id).first()
        if (!rig) {
          throw new BoatMaintenanceValidationError(
            'Rig does not belong to this boat',
            'rigNotBelongs'
          )
        }
        boatRigId = rig.id
        break
      }
      default:
        throw new BoatMaintenanceValidationError('Invalid subject', 'invalidSubject')
    }

    const notes = payload.notes?.trim() ? payload.notes.trim() : null

    return await db.transaction(async (trx) => {
      const event = await BoatMaintenanceEvent.create(
        {
          boatId: boat.id,
          subject: payload.subject,
          boatEngineId,
          boatSailId,
          boatRigId,
          boatSafetyEquipmentId,
          engineCaption,
          sailCaption,
          performedAt: toDateTime(payload.performedAt),
          title: payload.title.trim(),
          notes,
        },
        { client: trx }
      )

      const cleanParts =
        payload.parts
          ?.map((p) => ({
            name: (p.name ?? '').trim(),
            quantity: p.quantity?.trim() ? Number.parseInt(p.quantity.trim(), 10) : null,
            notes: p.notes?.trim() ? p.notes.trim() : null,
            enginePartId: p.enginePartId ?? null,
            unitPrice: p.unitPrice ?? null,
          }))
          .filter((p) => p.name.length > 0) ?? []

      for (const p of cleanParts) {
        if (p.quantity !== null && (!Number.isInteger(p.quantity) || p.quantity < 1)) {
          throw new BoatMaintenanceValidationError(
            'Each part quantity must be a positive integer',
            'partQtyInvalid'
          )
        }
      }

      if (cleanParts.length) {
        await BoatMaintenancePart.createMany(
          cleanParts.map((p) => ({
            maintenanceEventId: event.id,
            name: p.name,
            quantity: p.quantity,
            notes: p.notes,
            enginePartId: p.enginePartId,
            unitPrice: p.unitPrice,
          })),
          { client: trx }
        )

        // Decrement stock atomically to avoid read-modify-write race conditions
        const catalogParts = cleanParts.filter((p) => p.enginePartId !== null)
        for (const p of catalogParts) {
          const used = p.quantity ?? 1
          await BoatEnginePart.query({ client: trx })
            .where('id', p.enginePartId!)
            .update({
              stock: db.raw(
                'CASE WHEN stock IS NOT NULL THEN CASE WHEN stock < ? THEN 0 ELSE stock - ? END ELSE NULL END',
                [used, used]
              ),
              wearState: db.raw(
                `CASE WHEN stock IS NOT NULL AND stock <= ? AND wear_state != 'damaged' THEN 'to_replace' ELSE wear_state END`,
                [used]
              ),
            })
        }
      }

      await event.load('parts')
      return event
    })
  }

  async deleteForBoat(user: User, boat: Boat, eventId: number) {
    if (user.organizationId === null || user.organizationId !== boat.organizationId) {
      throw new BoatMaintenanceNotFoundError()
    }

    const event = await BoatMaintenanceEvent.query()
      .where('id', eventId)
      .where('boatId', boat.id)
      .first()

    if (!event) throw new BoatMaintenanceNotFoundError()

    await event.delete()
  }

  /**
   * Lists maintenance events for a specific engine.
   */
  async listEventsForEngine(boatId: number, engineId: number) {
    return await BoatMaintenanceEvent.query()
      .where('boatId', boatId)
      .where('boatEngineId', engineId)
      .preload('parts')
      .orderBy('performedAt', 'desc')
  }

  /**
   * Normalise les paramètres de query de l'historique (recherche / filtres /
   * tri / pagination) via les helpers partagés — voir `shared/helpers/query.ts`.
   */
  normalizeHistoryQuery(raw: Record<string, unknown>): MaintenanceHistoryFilters {
    const q = toTrimmedStringOrUndefined(raw.q) ?? ''
    const subject = normalizeEnum(raw.subject, VALID_HISTORY_SUBJECTS, '' as const)
    const boatId = toIntegerOrUndefined(raw.boatId)
    const sort = normalizeEnum(raw.sort, VALID_HISTORY_SORTS, 'recent' as const)
    const page = clampInt(toIntegerOrUndefined(raw.page) ?? 1, 1, 10_000)
    const perPage = clampInt(toIntegerOrUndefined(raw.perPage) ?? 20, 5, 100)

    return {
      q,
      subject,
      boatId: boatId !== undefined && boatId > 0 ? boatId : null,
      dateFrom: normalizeIsoDate(raw.dateFrom),
      dateTo: normalizeIsoDate(raw.dateTo),
      sort,
      page,
      perPage,
    }
  }

  /** Mappe un événement (parts préchargées) vers la ligne envoyée au frontend. */
  #toEventRow(ev: BoatMaintenanceEvent, boatName: string): MaintenanceEventRow {
    const parts = ev.parts.map((p) => {
      const price = p.unitPrice !== null ? Number.parseFloat(p.unitPrice) : null
      return {
        id: p.id,
        name: p.name,
        quantity: p.quantity,
        unitPrice: price,
        totalCost: price !== null ? Math.round(price * (p.quantity ?? 1) * 100) / 100 : null,
        enginePartId: p.enginePartId,
      }
    })
    return {
      id: ev.id,
      boatId: ev.boatId,
      boatName,
      subject: ev.subject,
      title: ev.title,
      notes: ev.notes,
      performedAt: ev.performedAt.toISODate()!,
      engineCaption: ev.engineCaption,
      sailCaption: ev.sailCaption,
      boatEngineId: ev.boatEngineId,
      boatSailId: ev.boatSailId,
      boatRigId: ev.boatRigId,
      boatSafetyEquipmentId: ev.boatSafetyEquipmentId,
      parts,
      totalCost: computeTotalCost(parts),
    }
  }

  /**
   * Historique de maintenance filtré et paginé pour toute l'organisation.
   * Les stats sont calculées sur l'ensemble filtré complet (pas seulement la
   * page courante).
   */
  async getHistoryForOrg(user: User, rawQuery: Record<string, unknown> = {}) {
    const filters = this.normalizeHistoryQuery(rawQuery)

    const emptyResult = {
      events: {
        data: [] as MaintenanceEventRow[],
        meta: { total: 0, perPage: filters.perPage, currentPage: filters.page, lastPage: 1 },
      },
      stats: { totalEvents: 0, totalParts: 0, totalBoats: 0, totalCost: null as number | null },
      filters,
      boatOptions: [] as MaintenanceBoatOption[],
    }

    if (!user.organizationId) return emptyResult

    const boatModule = await import('#models/boat')
    const Boat = boatModule.default
    const boats = await Boat.query()
      .select('id', 'name')
      .where('organizationId', user.organizationId)
      .orderBy('name', 'asc')
    const boatIds = boats.map((b) => b.id)
    const boatMap = new Map(boats.map((b) => [b.id, b.name]))
    const boatOptions: MaintenanceBoatOption[] = boats.map((b) => ({ id: b.id, name: b.name }))

    if (boatIds.length === 0) return { ...emptyResult, boatOptions }

    // Requête filtrée (sans tri/pagination) réutilisée pour les stats via clone.
    const filtered = BoatMaintenanceEvent.query().whereIn('boatId', boatIds)

    if (filters.subject) filtered.where('subject', filters.subject)
    if (filters.boatId !== null && boatMap.has(filters.boatId)) {
      filtered.where('boatId', filters.boatId)
    }
    if (filters.dateFrom) filtered.where('performedAt', '>=', filters.dateFrom)
    if (filters.dateTo) filtered.where('performedAt', '<=', filters.dateTo)
    if (filters.q) {
      const needle = `%${escapeLike(filters.q)}%`
      const lowered = filters.q.toLowerCase()
      const matchIds = boats.filter((b) => b.name.toLowerCase().includes(lowered)).map((b) => b.id)
      filtered.where((sub) => {
        sub.whereILike('title', needle)
        if (matchIds.length) sub.orWhereIn('boatId', matchIds)
      })
    }

    // Stats sur l'ensemble filtré complet.
    const [eventsCountRow] = await filtered.clone().count('* as total').pojo<{ total: number }>()
    const [boatsCountRow] = await filtered
      .clone()
      .countDistinct('boat_id as total')
      .pojo<{ total: number }>()
    const filteredParts = await BoatMaintenancePart.query().whereIn(
      'maintenanceEventId',
      filtered.clone().select('id')
    )
    const totalCost = computeTotalCost(
      filteredParts.map((p) => ({
        unitPrice: p.unitPrice !== null ? Number.parseFloat(p.unitPrice) : null,
        quantity: p.quantity,
      }))
    )

    const paginator = await filtered
      .preload('parts')
      .orderBy('performedAt', filters.sort === 'recent' ? 'desc' : 'asc')
      .orderBy('id', 'desc')
      .paginate(filters.page, filters.perPage)

    const data = paginator.all().map((ev) => this.#toEventRow(ev, boatMap.get(ev.boatId) ?? ''))

    return {
      events: {
        data,
        meta: {
          total: paginator.total,
          perPage: paginator.perPage,
          currentPage: paginator.currentPage,
          lastPage: paginator.lastPage,
        },
      },
      stats: {
        totalEvents: Number(eventsCountRow?.total ?? 0),
        totalParts: filteredParts.length,
        totalBoats: Number(boatsCountRow?.total ?? 0),
        totalCost,
      },
      filters,
      boatOptions,
    }
  }
}
