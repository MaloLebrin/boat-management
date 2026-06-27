import {
  ReservationConflictError,
  ReservationNotFoundError,
  ReservationValidationError,
} from '#exceptions/reservation_errors'
import BoatReservation from '#models/boat_reservation'
import type Boat from '#models/boat'
import type User from '#models/user'
import type { CreateReservationPayload, UpdateReservationPayload } from '#shared/types/reservation'
import { toDateTime } from '#shared/helpers/maintenance'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

function assertBoatScope(user: User, boat: Boat) {
  if (user.organizationId === null || user.organizationId !== boat.organizationId) {
    throw new ReservationNotFoundError()
  }
}

@inject()
export default class BoatReservationService {
  async listForBoat(user: User, boat: Boat): Promise<BoatReservation[]> {
    assertBoatScope(user, boat)

    return BoatReservation.query().where('boatId', boat.id).orderBy('starts_at', 'asc')
  }

  async listForOrg(user: User, boatIdFilter?: number | null): Promise<BoatReservation[]> {
    if (user.organizationId === null) return []

    const query = BoatReservation.query()
      .where('organizationId', user.organizationId)
      .preload('boat', (q) => q.select(['id', 'name']))
      .orderBy('starts_at', 'asc')

    if (boatIdFilter) {
      query.where('boatId', boatIdFilter)
    }

    return query
  }

  async create(
    user: User,
    boat: Boat,
    payload: CreateReservationPayload
  ): Promise<BoatReservation> {
    assertBoatScope(user, boat)

    const startsAt = toDateTime(payload.startsAt)
    const endsAt = toDateTime(payload.endsAt)

    if (endsAt <= startsAt) {
      throw new ReservationValidationError('endsAt must be after startsAt', 'endBeforeStart')
    }

    await this.checkConflict(boat.id, startsAt, endsAt, null)

    return BoatReservation.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: payload.status ?? 'option',
      startsAt,
      endsAt,
      clientName: payload.clientName.trim(),
      clientEmail: payload.clientEmail?.trim() || null,
      clientPhone: payload.clientPhone?.trim() || null,
      notes: payload.notes?.trim() || null,
      totalPrice:
        payload.totalPrice !== undefined && payload.totalPrice !== null
          ? String(payload.totalPrice)
          : null,
    })
  }

  async update(
    user: User,
    boat: Boat,
    reservationId: number,
    payload: UpdateReservationPayload
  ): Promise<BoatReservation> {
    assertBoatScope(user, boat)

    const reservation = await BoatReservation.query()
      .where('id', reservationId)
      .where('boatId', boat.id)
      .first()

    if (!reservation) throw new ReservationNotFoundError()

    const startsAt =
      payload.startsAt !== undefined ? toDateTime(payload.startsAt) : reservation.startsAt
    const endsAt = payload.endsAt !== undefined ? toDateTime(payload.endsAt) : reservation.endsAt

    if (endsAt <= startsAt) {
      throw new ReservationValidationError('endsAt must be after startsAt', 'endBeforeStart')
    }

    await this.checkConflict(boat.id, startsAt, endsAt, reservationId)

    if (payload.startsAt !== undefined) reservation.startsAt = startsAt
    if (payload.endsAt !== undefined) reservation.endsAt = endsAt
    if (payload.clientName !== undefined) reservation.clientName = payload.clientName.trim()
    if (payload.clientEmail !== undefined)
      reservation.clientEmail = payload.clientEmail?.trim() || null
    if (payload.clientPhone !== undefined)
      reservation.clientPhone = payload.clientPhone?.trim() || null
    if (payload.status !== undefined) reservation.status = payload.status
    if (payload.notes !== undefined) reservation.notes = payload.notes?.trim() || null
    if (payload.totalPrice !== undefined) {
      reservation.totalPrice = payload.totalPrice !== null ? String(payload.totalPrice) : null
    }

    await reservation.save()
    return reservation
  }

  async delete(user: User, boat: Boat, reservationId: number): Promise<void> {
    assertBoatScope(user, boat)

    const reservation = await BoatReservation.query()
      .where('id', reservationId)
      .where('boatId', boat.id)
      .first()

    if (!reservation) throw new ReservationNotFoundError()
    await reservation.delete()
  }

  private async checkConflict(
    boatId: number,
    startsAt: DateTime,
    endsAt: DateTime,
    excludeId: number | null
  ): Promise<void> {
    const query = BoatReservation.query()
      .where('boatId', boatId)
      .whereNot('status', 'cancelled')
      .where('startsAt', '<', endsAt.toISO()!)
      .where('endsAt', '>', startsAt.toISO()!)

    if (excludeId !== null) {
      query.whereNot('id', excludeId)
    }

    const conflict = await query.first()
    if (conflict) {
      throw new ReservationConflictError(conflict.id)
    }
  }
}
