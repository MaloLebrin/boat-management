import {
  ReservationConflictError,
  ReservationNotFoundError,
  ReservationValidationError,
  ReservationDurationError,
  ReservationBlacklistedClientError,
} from '#exceptions/reservation_errors'
import { BoatNotFoundError } from '#exceptions/boat_errors'
import BoatReservationService from '#services/boat_reservation_service'
import BoatService from '#services/boat_service'
import BoatPricingService from '#services/boat_pricing_service'
import PricingSeasonService from '#services/pricing_season_service'
import ClientService from '#services/client_service'
import { toBoatPricingRow } from '#transformers/boat_pricing_transformer'
import BoatPolicy from '#policies/boat_policy'
import {
  createBoatReservationValidator,
  updateBoatReservationValidator,
} from '#validators/boat_reservation_validator'
import { toBoatReservationRow } from '#transformers/boat_reservation_transformer'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type Boat from '#models/boat'
import type User from '#models/user'

@inject()
export default class BoatReservationsController {
  constructor(
    private boatService: BoatService,
    private reservationService: BoatReservationService,
    private boatPricingService: BoatPricingService,
    private pricingSeasonService: PricingSeasonService,
    private clientService: ClientService
  ) {}

  private async resolveBoat(
    user: User,
    boatId: number,
    response: HttpContext['response']
  ): Promise<Boat | null> {
    try {
      return await this.boatService.getForUserOrFail(user, boatId)
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return null
      }
      throw error
    }
  }

  async index({ inertia, params, auth, bouncer, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boat = await this.resolveBoat(user, Number(params.boatId), response)
    if (!boat) return

    await bouncer.with(BoatPolicy).authorize('view', boat)

    const [reservations, canManage, pricingModel, pricingSeasons, clientOptions] =
      await Promise.all([
        this.reservationService.listForBoat(user, boat),
        bouncer.with(BoatPolicy).allows('manage', boat),
        this.boatPricingService.getForBoat(boat),
        this.pricingSeasonService.listForBoatScope(boat.organizationId, boat.id),
        this.clientService.listOptions(boat.organizationId),
      ])

    const boatPricing = pricingModel ? toBoatPricingRow(pricingModel) : null

    return inertia.render('boats/reservations', {
      boat: { id: boat.id, name: boat.name },
      reservations: reservations.map((r) => toBoatReservationRow(r, boat.name)),
      canManage,
      boatPricing,
      pricingSeasons,
      clientOptions,
    })
  }

  async store({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boat = await this.resolveBoat(user, Number(params.boatId), response)
    if (!boat) return

    await bouncer.with(BoatPolicy).authorize('manage', boat)

    const payload = await request.validateUsing(createBoatReservationValidator)

    let cancelledOptions = 0
    try {
      ;({ cancelledOptions } = await this.reservationService.create(user, boat, {
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        clientId: payload.clientId ?? null,
        clientName: payload.clientName,
        clientEmail: payload.clientEmail ?? null,
        clientPhone: payload.clientPhone ?? null,
        status: payload.status,
        notes: payload.notes ?? null,
        totalPrice: payload.totalPrice ?? null,
      }))
    } catch (error) {
      if (error instanceof ReservationConflictError) {
        session.flash('error', i18n.t('flash.reservation.conflict'))
        return response.redirect().back()
      }
      if (error instanceof ReservationBlacklistedClientError) {
        session.flash('error', i18n.t('flash.reservation.blacklistedClient'))
        return response.redirect().back()
      }
      if (error instanceof ReservationValidationError) {
        session.flash('error', i18n.t(`flash.reservation.${error.errorCode}`))
        return response.redirect().back()
      }
      if (error instanceof ReservationDurationError) {
        session.flash(
          'error',
          i18n.t(
            error.reason === 'below_min'
              ? 'flash.reservation.belowMinDays'
              : 'flash.reservation.aboveMaxDays'
          )
        )
        return response.redirect().back()
      }
      throw error
    }

    session.flash(
      'success',
      cancelledOptions > 0
        ? i18n.t('flash.reservation.optionsOverridden', { count: String(cancelledOptions) })
        : i18n.t('flash.reservation.created')
    )
    return response.redirect().back()
  }

  async update({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boat = await this.resolveBoat(user, Number(params.boatId), response)
    if (!boat) return

    await bouncer.with(BoatPolicy).authorize('manage', boat)

    const payload = await request.validateUsing(updateBoatReservationValidator)

    let cancelledOptions = 0
    try {
      ;({ cancelledOptions } = await this.reservationService.update(
        user,
        boat,
        Number(params.reservationId),
        {
          startsAt: payload.startsAt,
          endsAt: payload.endsAt,
          clientId: payload.clientId,
          clientName: payload.clientName,
          clientEmail: payload.clientEmail,
          clientPhone: payload.clientPhone,
          status: payload.status,
          notes: payload.notes,
          totalPrice: payload.totalPrice,
        }
      ))
    } catch (error) {
      if (error instanceof ReservationNotFoundError) {
        session.flash('error', i18n.t('flash.reservation.notFound'))
        return response.redirect().back()
      }
      if (error instanceof ReservationConflictError) {
        session.flash('error', i18n.t('flash.reservation.conflict'))
        return response.redirect().back()
      }
      if (error instanceof ReservationBlacklistedClientError) {
        session.flash('error', i18n.t('flash.reservation.blacklistedClient'))
        return response.redirect().back()
      }
      if (error instanceof ReservationValidationError) {
        session.flash('error', i18n.t(`flash.reservation.${error.errorCode}`))
        return response.redirect().back()
      }
      if (error instanceof ReservationDurationError) {
        session.flash(
          'error',
          i18n.t(
            error.reason === 'below_min'
              ? 'flash.reservation.belowMinDays'
              : 'flash.reservation.aboveMaxDays'
          )
        )
        return response.redirect().back()
      }
      throw error
    }

    session.flash(
      'success',
      cancelledOptions > 0
        ? i18n.t('flash.reservation.optionsOverridden', { count: String(cancelledOptions) })
        : i18n.t('flash.reservation.updated')
    )
    return response.redirect().back()
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boat = await this.resolveBoat(user, Number(params.boatId), response)
    if (!boat) return

    const reservation = await this.reservationService.findForBoat(
      user,
      boat,
      Number(params.reservationId)
    )

    if (!reservation) {
      session.flash('error', i18n.t('flash.reservation.notFound'))
      return response.redirect().back()
    }

    await bouncer.with(BoatPolicy).authorize('deleteReservation', boat, reservation)

    try {
      await this.reservationService.delete(user, boat, reservation.id)
    } catch (error) {
      if (error instanceof ReservationNotFoundError) {
        session.flash('error', i18n.t('flash.reservation.notFound'))
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', i18n.t('flash.reservation.deleted'))
    return response.redirect().back()
  }
}
