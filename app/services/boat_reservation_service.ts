import {
  ReservationConflictError,
  ReservationNotFoundError,
  ReservationValidationError,
  ReservationDurationError,
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
import { countBilledNights } from '#shared/helpers/reservation_quote'
import BoatPricingService from '#services/boat_pricing_service'
import ReservationQuoteService from '#services/reservation_quote_service'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

function assertBoatScope(user: User, boat: Boat) {
  if (user.organizationId === null || user.organizationId !== boat.organizationId) {
    throw new ReservationNotFoundError()
  }
}

/**
 * Allowed status transitions for a reservation. A firm booking can only be
 * cancelled (no downgrade back to option); a cancellation is terminal (create a
 * new reservation instead of reactivating). Staying on the same status is a
 * no-op and always allowed.
 */
const ALLOWED_RESERVATION_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  option: ['confirmed', 'cancelled'],
  confirmed: ['cancelled'],
  cancelled: [],
}

@inject()
export default class BoatReservationService {
  constructor(
    private pricingService: BoatPricingService,
    private quoteService: ReservationQuoteService
  ) {}

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

    // Duration bounds check (before transaction)
    const pricing = await this.pricingService.getForBoat(boat)
    if (pricing) {
      const nights = countBilledNights(startsAt.toISO()!, endsAt.toISO()!)
      if (nights > 0) {
        if (pricing.minDays !== null && nights < pricing.minDays) {
          throw new ReservationDurationError('below_min')
        }
        if (pricing.maxDays !== null && nights > pricing.maxDays) {
          throw new ReservationDurationError('above_max')
        }
      }
    }

    // Auto-fill totalPrice if not provided
    let totalPrice: string | null = null
    if (payload.totalPrice !== undefined && payload.totalPrice !== null) {
      totalPrice = String(payload.totalPrice)
    } else {
      const quote = await this.quoteService.quoteForBoat(boat, startsAt.toISO()!, endsAt.toISO()!)
      if (quote.hasPricing) {
        totalPrice = String(quote.total)
      }
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
          totalPrice,
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

    // Duration bounds check (before transaction)
    const pricing = await this.pricingService.getForBoat(boat)
    if (pricing) {
      const nights = countBilledNights(startsAt.toISO()!, endsAt.toISO()!)
      if (nights > 0) {
        if (pricing.minDays !== null && nights < pricing.minDays) {
          throw new ReservationDurationError('below_min')
        }
        if (pricing.maxDays !== null && nights > pricing.maxDays) {
          throw new ReservationDurationError('above_max')
        }
      }
    }

    const effectiveStatus = payload.status ?? reservation.status

    if (payload.status !== undefined && payload.status !== reservation.status) {
      if (!ALLOWED_RESERVATION_TRANSITIONS[reservation.status].includes(payload.status)) {
        throw new ReservationValidationError(
          `invalid status transition from ${reservation.status} to ${payload.status}`,
          'invalidTransition'
        )
      }
    }

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

  /**
   * Finds a reservation by id within an organization (across all its boats),
   * with the boat preloaded. Returns null when it doesn't exist or belongs to
   * another organization.
   */
  async findForOrganization(
    organizationId: number,
    reservationId: number
  ): Promise<BoatReservation | null> {
    return BoatReservation.query()
      .where('id', reservationId)
      .where('organizationId', organizationId)
      .preload('boat', (q) => q.select(['id', 'name']))
      .first()
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
