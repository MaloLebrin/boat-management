import {
  BoatInspectionNotFoundError,
  BoatInspectionValidationError,
} from '#exceptions/inspection_errors'
import BoatInspection from '#models/boat_inspection'
import type BoatReservation from '#models/boat_reservation'
import type User from '#models/user'
import { inject } from '@adonisjs/core'
import type { CreateInspectionPayload, UpdateInspectionPayload } from '#shared/types/inspection'
import { toDateTime } from '#shared/helpers/date'

function assertReservationScope(user: User, reservation: BoatReservation) {
  if (user.organizationId === null || user.organizationId !== reservation.organizationId) {
    throw new BoatInspectionNotFoundError()
  }
}

@inject()
export default class BoatInspectionService {
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

    return await BoatInspection.create({
      reservationId: reservation.id,
      organizationId: reservation.organizationId,
      kind: payload.kind,
      performedAt: toDateTime(payload.performedAt).plus({ minutes: payload.tzOffsetMinutes ?? 0 }),
      fuelLevel: payload.fuelLevel ?? null,
      engineHours: payload.engineHours?.toString() ?? null,
      notes: payload.notes?.trim() || null,
    })
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

  async deleteForReservation(user: User, reservation: BoatReservation, inspectionId: number) {
    assertReservationScope(user, reservation)

    const inspection = await BoatInspection.query()
      .where('id', inspectionId)
      .where('reservationId', reservation.id)
      .first()

    if (!inspection) throw new BoatInspectionNotFoundError()
    await inspection.delete()
  }
}
