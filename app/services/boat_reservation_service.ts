import {
  ReservationConflictError,
  ReservationNotFoundError,
  ReservationValidationError,
  ReservationDurationError,
  ReservationBlacklistedClientError,
} from '#exceptions/reservation_errors'
import BoatReservation from '#models/boat_reservation'
import BoatModel from '#models/boat'
import Client from '#models/client'
import type Boat from '#models/boat'
import type User from '#models/user'
import type {
  CreateReservationPayload,
  FleetBoatOption,
  ReservationStatus,
  ReservationType,
  UpdateReservationPayload,
} from '#shared/types/reservation'
import { toUtcFromLocalInput } from '#shared/helpers/date'
import { UPCOMING_RESERVATIONS_CAP, UPCOMING_RESERVATIONS_DAYS } from '#shared/constants/dashboard'
import { CHARTER_OCCUPANCY_DAYS } from '#shared/constants/dashboard_widgets'
import type {
  DashboardCharterOccupancy,
  DashboardUpcomingReservation,
} from '#shared/types/dashboard'
import { countBilledNights } from '#shared/helpers/reservation_quote'
import BoatPricingService from '#services/boat_pricing_service'
import ReservationQuoteService from '#services/reservation_quote_service'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { assertBoatInUserOrg } from '#utils/boat_utils'

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
    assertBoatInUserOrg(user, boat, () => new ReservationNotFoundError())

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

  async listForOrg(
    user: User,
    boatIdFilter?: number | null,
    typeFilter?: ReservationType | null
  ): Promise<BoatReservation[]> {
    if (user.organizationId === null) return []

    const query = BoatReservation.query()
      .where('organizationId', user.organizationId)
      .preload('boat', (q) => q.select(['id', 'name']))
      .orderBy('starts_at', 'asc')

    if (boatIdFilter) {
      query.where('boatId', boatIdFilter)
    }

    if (typeFilter) {
      query.where('type', typeFilter)
    }

    return query
  }

  /**
   * Départs et retours des prochains jours pour le tableau de bord (#832) :
   * réservations `option` ou `confirmed` qui commencent dans la fenêtre
   * (départ) ou déjà en cours qui s'y terminent (retour), triées par instant.
   */
  async listUpcomingForOrg(
    user: User,
    now: DateTime = DateTime.now(),
    days: number = UPCOMING_RESERVATIONS_DAYS,
    limit: number = UPCOMING_RESERVATIONS_CAP
  ): Promise<DashboardUpcomingReservation[]> {
    if (user.organizationId === null) return []
    const horizon = now.plus({ days })

    const rows = await BoatReservation.query()
      .where('organizationId', user.organizationId)
      .whereIn('status', ['option', 'confirmed'])
      .where((q) => {
        q.whereBetween('startsAt', [now.toISO()!, horizon.toISO()!]).orWhere((ongoing) =>
          ongoing
            .where('startsAt', '<', now.toISO()!)
            .whereBetween('endsAt', [now.toISO()!, horizon.toISO()!])
        )
      })
      .preload('boat', (q) => q.select(['id', 'name']))
      .orderBy('starts_at', 'asc')

    return rows
      .map((r): DashboardUpcomingReservation => {
        const event = r.startsAt >= now ? 'departure' : 'return'
        return {
          id: r.id,
          boatId: r.boatId,
          boatName: r.boat?.name ?? `#${r.boatId}`,
          clientName: r.clientName,
          status: r.status,
          type: r.type,
          event,
          at: (event === 'departure' ? r.startsAt : r.endsAt).toISO()!,
          startsAt: r.startsAt.toISO()!,
          endsAt: r.endsAt.toISO()!,
        }
      })
      .sort((a, b) => a.at.localeCompare(b.at))
      .slice(0, limit)
  }

  /**
   * Widget « Occupation location » : réservations `option` / `confirmed` qui
   * chevauchent la fenêtre `[now, now + days)`. Le taux ne compte que les
   * confirmées, bornées à la fenêtre (jours-bateau / bateaux × jours) ; le
   * chiffre d'affaires ne compte que les confirmées qui **commencent** dans la
   * fenêtre, pour ne pas compter deux fois une même réservation d'une fenêtre à
   * l'autre. Ne renvoie jamais `null` (#478).
   */
  async getOccupancyForOrg(
    user: User,
    boatCount: number,
    now: DateTime = DateTime.now(),
    days: number = CHARTER_OCCUPANCY_DAYS
  ): Promise<DashboardCharterOccupancy> {
    const summary: DashboardCharterOccupancy = {
      windowDays: days,
      boats: boatCount,
      occupancyRate: 0,
      reservedBoatDays: 0,
      confirmed: 0,
      options: 0,
      confirmedRevenue: 0,
    }
    if (user.organizationId === null || boatCount === 0) return summary
    const horizon = now.plus({ days })

    const rows = await BoatReservation.query()
      .where('organizationId', user.organizationId)
      .whereIn('status', ['option', 'confirmed'])
      .where('startsAt', '<', horizon.toISO()!)
      .where('endsAt', '>', now.toISO()!)
      .select(['id', 'boatId', 'status', 'startsAt', 'endsAt', 'totalPrice'])

    let reservedMs = 0
    for (const reservation of rows) {
      if (reservation.status !== 'confirmed') {
        summary.options += 1
        continue
      }
      summary.confirmed += 1
      const start = reservation.startsAt < now ? now : reservation.startsAt
      const end = reservation.endsAt > horizon ? horizon : reservation.endsAt
      reservedMs += Math.max(end.toMillis() - start.toMillis(), 0)
      if (reservation.startsAt >= now && reservation.totalPrice !== null) {
        summary.confirmedRevenue += Number.parseFloat(String(reservation.totalPrice)) || 0
      }
    }

    const reservedDays = reservedMs / 86_400_000
    summary.reservedBoatDays = Math.round(reservedDays * 10) / 10
    summary.occupancyRate = Math.min(100, Math.round((100 * reservedDays) / (boatCount * days)))
    summary.confirmedRevenue = Math.round(summary.confirmedRevenue * 100) / 100
    return summary
  }

  async create(
    user: User,
    boat: Boat,
    payload: CreateReservationPayload
  ): Promise<{ reservation: BoatReservation; cancelledOptions: number }> {
    assertBoatInUserOrg(user, boat, () => new ReservationNotFoundError())

    const startsAt = toUtcFromLocalInput(payload.startsAt, payload.tzOffsetMinutes)
    const endsAt = toUtcFromLocalInput(payload.endsAt, payload.tzOffsetMinutes)

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

    // Resolve the optional CRM client (org-scoped) and block blacklisted ones.
    const clientId = await this.#resolveClientId(boat.organizationId, payload.clientId)

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
          type: payload.type ?? null,
          startsAt,
          endsAt,
          clientId,
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
    assertBoatInUserOrg(user, boat, () => new ReservationNotFoundError())

    const reservation = await BoatReservation.query()
      .where('id', reservationId)
      .where('boatId', boat.id)
      .first()

    if (!reservation) throw new ReservationNotFoundError()

    const startsAt =
      payload.startsAt !== undefined
        ? toUtcFromLocalInput(payload.startsAt, payload.tzOffsetMinutes)
        : reservation.startsAt
    const endsAt =
      payload.endsAt !== undefined
        ? toUtcFromLocalInput(payload.endsAt, payload.tzOffsetMinutes)
        : reservation.endsAt

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

    // Resolve the optional CRM client (org-scoped) and block blacklisted ones,
    // only when the client is part of this update.
    let resolvedClientId: number | null | undefined
    if (payload.clientId !== undefined) {
      resolvedClientId = await this.#resolveClientId(boat.organizationId, payload.clientId)
    }

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
      if (resolvedClientId !== undefined) reservation.clientId = resolvedClientId
      if (payload.clientName !== undefined) reservation.clientName = payload.clientName.trim()
      if (payload.clientEmail !== undefined)
        reservation.clientEmail = payload.clientEmail?.trim() || null
      if (payload.clientPhone !== undefined)
        reservation.clientPhone = payload.clientPhone?.trim() || null
      if (payload.status !== undefined) reservation.status = payload.status
      if (payload.type !== undefined) reservation.type = payload.type
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
    assertBoatInUserOrg(user, boat, () => new ReservationNotFoundError())

    return BoatReservation.query().where('id', reservationId).where('boatId', boat.id).first()
  }

  /**
   * Resolves an optional CRM client id against the organization (#275):
   * - returns `null` when no client is provided or the id doesn't belong to the org
   *   (cross-org ids are silently ignored, like invoices);
   * - throws `ReservationBlacklistedClientError` when the client is blacklisted.
   */
  async #resolveClientId(
    organizationId: number,
    clientId: number | null | undefined
  ): Promise<number | null> {
    if (!clientId) return null

    const client = await Client.query()
      .where('id', clientId)
      .where('organizationId', organizationId)
      .first()

    if (!client) return null
    if (client.status === 'blacklisted') throw new ReservationBlacklistedClientError()
    return client.id
  }

  /**
   * Reservation history for a client (#275): all reservations linked to the client
   * within the organization, most recent first, with the boat preloaded.
   */
  async listForClient(organizationId: number, clientId: number): Promise<BoatReservation[]> {
    return BoatReservation.query()
      .where('organizationId', organizationId)
      .where('clientId', clientId)
      .preload('boat', (q) => q.select(['id', 'name']))
      .orderBy('starts_at', 'desc')
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
