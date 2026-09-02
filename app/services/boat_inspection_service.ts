import {
  BoatInspectionConflictError,
  BoatInspectionNotFoundError,
  BoatInspectionValidationError,
} from '#exceptions/inspection_errors'
import BoatInspection from '#models/boat_inspection'
import BoatInspectionItem from '#models/boat_inspection_item'
import type BoatReservation from '#models/boat_reservation'
import type Organization from '#models/organization'
import type User from '#models/user'
import { CloudinaryFolders } from '#services/cloudinary_service'
import MediaService from '#services/media_service'
import { inject } from '@adonisjs/core'
import { ALL_INSPECTION_ITEM_KEYS } from '#shared/constants/inspections/inspection_checklist_content'
import type {
  ConflictInspectionSnapshot,
  CreateInspectionPayload,
  SetInspectionItemPayload,
  UpdateInspectionPayload,
} from '#shared/types/inspection'
import { toUtcFromLocalInput } from '#shared/helpers/date'

/** Champs confrontés à la version locale par la modale de résolution (#622). */
function buildConflictSnapshot(inspection: BoatInspection): ConflictInspectionSnapshot {
  return {
    id: inspection.id,
    updatedAt: inspection.updatedAt?.toISO() ?? '',
    performedAt: inspection.performedAt?.toISO() ?? '',
    fuelLevel: inspection.fuelLevel,
    engineHours: inspection.engineHours,
    notes: inspection.notes,
  }
}

function assertReservationScope(user: User, reservation: BoatReservation) {
  if (user.organizationId === null || user.organizationId !== reservation.organizationId) {
    throw new BoatInspectionNotFoundError()
  }
}

/**
 * Detects the PostgreSQL unique-violation (23505) raised by the
 * (reservation_id, kind) index, so a concurrent duplicate create surfaces as
 * a business error instead of a raw 500.
 */
function isKindConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const err = error as { code?: unknown }
  return err.code === '23505'
}

@inject()
export default class BoatInspectionService {
  constructor(private mediaService: MediaService) {}

  async listForReservation(user: User, reservation: BoatReservation) {
    assertReservationScope(user, reservation)

    return await BoatInspection.query()
      .where('reservationId', reservation.id)
      .orderBy('kind', 'asc')
  }

  async createForReservation(
    user: User,
    reservation: BoatReservation,
    payload: CreateInspectionPayload
  ) {
    assertReservationScope(user, reservation)

    const existing = await BoatInspection.query()
      .where('reservationId', reservation.id)
      .where('kind', payload.kind)
      .first()

    if (existing) {
      throw new BoatInspectionValidationError('kind already exists', 'kindAlreadyExists')
    }

    try {
      return await BoatInspection.create({
        reservationId: reservation.id,
        organizationId: reservation.organizationId,
        kind: payload.kind,
        performedAt: toUtcFromLocalInput(payload.performedAt, payload.tzOffsetMinutes),
        fuelLevel: payload.fuelLevel ?? null,
        engineHours: payload.engineHours?.toString() ?? null,
        notes: payload.notes?.trim() || null,
      })
    } catch (error) {
      if (isKindConflict(error)) {
        throw new BoatInspectionValidationError('kind already exists', 'kindAlreadyExists')
      }
      throw error
    }
  }

  async findForReservation(user: User, reservation: BoatReservation, inspectionId: number) {
    assertReservationScope(user, reservation)

    const inspection = await BoatInspection.query()
      .where('id', inspectionId)
      .where('reservationId', reservation.id)
      .first()

    if (!inspection) throw new BoatInspectionNotFoundError()
    return inspection
  }

  async updateForReservation(
    user: User,
    reservation: BoatReservation,
    inspectionId: number,
    payload: UpdateInspectionPayload
  ) {
    assertReservationScope(user, reservation)

    const inspection = await BoatInspection.query()
      .where('id', inspectionId)
      .where('reservationId', reservation.id)
      .first()

    if (!inspection) throw new BoatInspectionNotFoundError()

    // Rejeu hors-ligne (#622) : l'inspection a bougé depuis la saisie — la
    // modale de résolution tranche plutôt qu'un last-write-wins silencieux.
    if (payload.expectedUpdatedAt !== undefined && inspection.updatedAt) {
      if (inspection.updatedAt.toISO() !== payload.expectedUpdatedAt) {
        throw new BoatInspectionConflictError(buildConflictSnapshot(inspection))
      }
    }

    if (payload.performedAt !== undefined) {
      inspection.performedAt = toUtcFromLocalInput(payload.performedAt, payload.tzOffsetMinutes)
    }
    if (payload.fuelLevel !== undefined) inspection.fuelLevel = payload.fuelLevel
    if (payload.engineHours !== undefined) {
      inspection.engineHours = payload.engineHours?.toString() ?? null
    }
    if (payload.notes !== undefined) inspection.notes = payload.notes?.trim() || null

    await inspection.save()
    return inspection
  }

  /** Constats de la checklist d'une inspection (#584) — le frontend les rapproche du corpus par clé. */
  async listItems(user: User, reservation: BoatReservation, inspectionId: number) {
    await this.findForReservation(user, reservation, inspectionId)

    return await BoatInspectionItem.query()
      .where('boatInspectionId', inspectionId)
      .orderBy('itemKey', 'asc')
  }

  /**
   * Enregistre (ou met à jour) le constat d'un point de contrôle. L'upsert sur
   * l'unique `(boat_inspection_id, item_key)` rend l'opération idempotente ;
   * repasser un point en `ok` efface sa note, devenue sans objet.
   */
  async setItem(
    user: User,
    reservation: BoatReservation,
    inspectionId: number,
    payload: SetInspectionItemPayload
  ) {
    const inspection = await this.findForReservation(user, reservation, inspectionId)

    if (!ALL_INSPECTION_ITEM_KEYS.has(payload.itemKey)) {
      throw new BoatInspectionValidationError('unknown checklist item', 'itemNotFound')
    }

    return await BoatInspectionItem.updateOrCreate(
      { boatInspectionId: inspection.id, itemKey: payload.itemKey },
      {
        state: payload.state,
        note: payload.state === 'ok' ? null : (payload.note?.trim() ?? null),
      }
    )
  }

  /** Repasse un point de contrôle à « non contrôlé » en supprimant sa ligne. */
  async clearItem(user: User, reservation: BoatReservation, inspectionId: number, itemKey: string) {
    const inspection = await this.findForReservation(user, reservation, inspectionId)

    await BoatInspectionItem.query()
      .where('boatInspectionId', inspection.id)
      .where('itemKey', itemKey)
      .delete()
  }

  async deleteForReservation(
    user: User,
    reservation: BoatReservation,
    inspectionId: number,
    org?: Organization
  ) {
    assertReservationScope(user, reservation)

    const inspection = await BoatInspection.query()
      .where('id', inspectionId)
      .where('reservationId', reservation.id)
      .first()

    if (!inspection) throw new BoatInspectionNotFoundError()

    if (org) {
      await this.mediaService.deleteAllForEntity(
        'inspection',
        inspection.id,
        CloudinaryFolders.inspectionPhotos(
          org.slug,
          reservation.boatId,
          reservation.id,
          inspection.kind
        ),
        org
      )
    }

    await inspection.delete()
  }
}
