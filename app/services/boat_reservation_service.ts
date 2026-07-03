import {
  ReservationConflictError,
  ReservationNotFoundError,
  ReservationValidationError,
} from '#exceptions/reservation_errors'
import BoatReservation from '#models/boat_reservation'
import BoatModel from '#models/boat'
import type Boat from '#models/boat'
import type User from '#models/user'
import type {
  CreateReservationPayload,
  FleetBoatOption,
  ReservationStatus,
  UpdateReservationPayload,
} from '#shared/types/reservation'
import { toDateTime } from '#shared/helpers/date'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
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

  async listBoatsForOrg(user: User): Promise<FleetBoatOption[]> {
    if (user.organizationId === null) return []
    const boats = await BoatModel.query()
      .select(['id', 'name'])
      .where('organizationId', user.organizationId)
      .orderBy('name')
    return boats.map((b) => ({ id: b.id, name: b.name }))
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
  ): Promise<{ reservation: BoatReservation; cancelledOptions: number }> {
    assertBoatScope(user, boat)

    const startsAt = toDateTime(payload.startsAt)
    const endsAt = toDateTime(payload.endsAt)

    if (endsAt <= startsAt) {
      throw new ReservationValidationError('endsAt must be after startsAt', 'endBeforeStart')
    }

    const status = payload.status ?? 'option'

    return db.transaction(async (trx) => {
      await this.checkConflict(boat.id, startsAt, endsAt, null, status, trx)

      const cancelledOptions =
        status === 'confirmed'
          ? await this.cancelOverlappingOptions(boat.id, startsAt, endsAt, null, trx)
          : 0

      const reservation = await BoatReservation.create(
        {
          boatId: boat.id,
          organizationId: boat.organizationId,
          status,
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
        },
        { client: trx }
      )

      return { reservation, cancelledOptions }
    })
  }

  async update(
    user: User,
    boat: Boat,
    reservationId: number,
    payload: UpdateReservationPayload
  ): Promise<{ reservation: BoatReservation; cancelledOptions: number }> {
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

    const effectiveStatus = payload.status ?? reservation.status

    return db.transaction(async (trx) => {
      await this.checkConflict(boat.id, startsAt, endsAt, reservationId, effectiveStatus, trx)

      const cancelledOptions =
        effectiveStatus === 'confirmed'
          ? await this.cancelOverlappingOptions(boat.id, startsAt, endsAt, reservationId, trx)
          : 0

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

      reservation.useTransaction(trx)
      await reservation.save()

      return { reservation, cancelledOptions }
    })
  }

  async findForBoat(
    user: User,
    boat: Boat,
    reservationId: number
  ): Promise<BoatReservation | null> {
    assertBoatScope(user, boat)

    return BoatReservation.query().where('id', reservationId).where('boatId', boat.id).first()
  }

  async delete(user: User, boat: Boat, reservationId: number): Promise<void> {
    const reservation = await this.findForBoat(user, boat, reservationId)

    if (!reservation) throw new ReservationNotFoundError()
    await reservation.delete()
  }

  /**
   * Enforces the option/confirmed priority rule:
   * - a `confirmed` booking is only blocked by another overlapping `confirmed`
   *   (overlapping `option`s are auto-cancelled, see cancelOverlappingOptions);
   * - an `option` is blocked by any overlapping non-cancelled reservation
   *   (one hold per slot);
   * - a `cancelled` reservation never conflicts.
   */
  private async checkConflict(
    boatId: number,
    startsAt: DateTime,
    endsAt: DateTime,
    excludeId: number | null,
    incomingStatus: ReservationStatus,
    trx: TransactionClientContract
  ): Promise<void> {
    if (incomingStatus === 'cancelled') return

    const query = BoatReservation.query({ client: trx })
      .where('boatId', boatId)
      .where('startsAt', '<', endsAt.toISO()!)
      .where('endsAt', '>', startsAt.toISO()!)

    if (incomingStatus === 'confirmed') {
      query.where('status', 'confirmed')
    } else {
      query.whereNot('status', 'cancelled')
    }

    if (excludeId !== null) {
      query.whereNot('id', excludeId)
    }

    const conflict = await query.first()
    if (conflict) {
      throw new ReservationConflictError()
    }
  }

  /**
   * Cancels every overlapping `option` on the same boat, so a `confirmed`
   * booking takes over the slot without leaving a stale conflicting hold.
   * Returns the number of options cancelled.
   */
  private async cancelOverlappingOptions(
    boatId: number,
    startsAt: DateTime,
    endsAt: DateTime,
    excludeId: number | null,
    trx: TransactionClientContract
  ): Promise<number> {
    const query = BoatReservation.query({ client: trx })
      .where('boatId', boatId)
      .where('status', 'option')
      .where('startsAt', '<', endsAt.toISO()!)
      .where('endsAt', '>', startsAt.toISO()!)

    if (excludeId !== null) {
      query.whereNot('id', excludeId)
    }

    const options = await query
    for (const option of options) {
      option.status = 'cancelled'
      await option.useTransaction(trx).save()
    }

    return options.length
  }
}
