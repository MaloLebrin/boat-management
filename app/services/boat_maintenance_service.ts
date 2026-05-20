import {
  BoatMaintenanceNotFoundError,
  BoatMaintenanceValidationError,
} from '#exceptions/maintenance_errors'
import type Boat from '#models/boat'
import type { CreateMaintenancePayload } from '#shared/types/maintenance'
import BoatEngine from '#models/boat_engine'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import BoatMaintenancePart from '#models/boat_maintenance_part'
import BoatRig from '#models/boat_rig'
import BoatSail from '#models/boat_sail'
import type User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export { BoatMaintenanceNotFoundError, BoatMaintenanceValidationError }
export type { CreateMaintenancePayload }

function toDateTime(value: Date | string | DateTime): DateTime {
  if (DateTime.isDateTime(value)) return value
  if (value instanceof Date) return DateTime.fromJSDate(value)
  return DateTime.fromISO(String(value))
}

function buildEngineCaption(engine: BoatEngine): string {
  const bits = [engine.brand, engine.model, engine.serialNumber].filter(Boolean)
  const label = bits.join(' ').trim()
  return label || engine.kind
}

function buildSailCaption(sail: BoatSail): string {
  const bits = [
    sail.sailType,
    sail.material,
    sail.areaM2 !== null ? `${sail.areaM2} m²` : null,
  ].filter(Boolean)
  return bits.join(' · ')
}

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
    let engineCaption: string | null = null
    let sailCaption: string | null = null

    switch (payload.subject) {
      case 'boat':
      case 'hull':
      case 'electrical':
      case 'plumbing':
      case 'safety':
      case 'deck':
      case 'other':
        break
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
            'sailCaptionRequired'
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
          })),
          { client: trx }
        )
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
}
