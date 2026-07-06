import {
  BoatInspectionNotFoundError,
  BoatInspectionValidationError,
} from '#exceptions/inspection_errors'
import BoatInspection from '#models/boat_inspection'
import type BoatReservation from '#models/boat_reservation'
import type Organization from '#models/organization'
import type User from '#models/user'
import { CloudinaryFolders } from '#services/cloudinary_service'
import MediaService from '#services/media_service'
import { inject } from '@adonisjs/core'
import type { CreateInspectionPayload, UpdateInspectionPayload } from '#shared/types/inspection'
import { toDateTime } from '#shared/helpers/date'

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
        performedAt: toDateTime(payload.performedAt).plus({
          minutes: payload.tzOffsetMinutes ?? 0,
        }),
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

    if (payload.performedAt !== undefined) {
      inspection.performedAt = toDateTime(payload.performedAt).plus({
        minutes: payload.tzOffsetMinutes ?? 0,
      })
    }
    if (payload.fuelLevel !== undefined) inspection.fuelLevel = payload.fuelLevel
    if (payload.engineHours !== undefined) {
      inspection.engineHours = payload.engineHours?.toString() ?? null
    }
    if (payload.notes !== undefined) inspection.notes = payload.notes?.trim() || null

    await inspection.save()
    return inspection
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
