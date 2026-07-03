import {
  ReservationConflictError,
  ReservationNotFoundError,
  ReservationValidationError,
} from '#exceptions/reservation_errors'
import { BoatNotFoundError } from '#exceptions/boat_errors'
import BoatReservationService from '#services/boat_reservation_service'
import BoatService from '#services/boat_service'
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
    private reservationService: BoatReservationService
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

    const [reservations, canManage] = await Promise.all([
      this.reservationService.listForBoat(user, boat),
      bouncer.with(BoatPolicy).allows('manage', boat),
    ])

    return inertia.render('boats/reservations', {
      boat: { id: boat.id, name: boat.name },
      reservations: reservations.map((r) => toBoatReservationRow(r, boat.name)),
      canManage,
    })
  }

  async store({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boat = await this.resolveBoat(user, Number(params.boatId), response)
    if (!boat) return

    await bouncer.with(BoatPolicy).authorize('manage', boat)

    const payload = await request.validateUsing(createBoatReservationValidator)

    try {
      await this.reservationService.create(user, boat, {
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        clientName: payload.clientName,
        clientEmail: payload.clientEmail ?? null,
        clientPhone: payload.clientPhone ?? null,
        status: payload.status,
        notes: payload.notes ?? null,
        totalPrice: payload.totalPrice ?? null,
      })
    } catch (error) {
      if (error instanceof ReservationConflictError) {
        session.flash('error', i18n.t('flash.reservation.conflict'))
        return response.redirect().back()
      }
      if (error instanceof ReservationValidationError) {
        session.flash('error', i18n.t(`flash.reservation.${error.errorCode}`))
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', i18n.t('flash.reservation.created'))
    return response.redirect().back()
  }

  async update({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boat = await this.resolveBoat(user, Number(params.boatId), response)
    if (!boat) return

    await bouncer.with(BoatPolicy).authorize('manage', boat)

    const payload = await request.validateUsing(updateBoatReservationValidator)

    try {
      await this.reservationService.update(user, boat, Number(params.reservationId), {
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        clientName: payload.clientName,
        clientEmail: payload.clientEmail,
        clientPhone: payload.clientPhone,
        status: payload.status,
        notes: payload.notes,
        totalPrice: payload.totalPrice,
      })
    } catch (error) {
      if (error instanceof ReservationNotFoundError) {
        session.flash('error', i18n.t('flash.reservation.notFound'))
        return response.redirect().back()
      }
      if (error instanceof ReservationConflictError) {
        session.flash('error', i18n.t('flash.reservation.conflict'))
        return response.redirect().back()
      }
      if (error instanceof ReservationValidationError) {
        session.flash('error', i18n.t(`flash.reservation.${error.errorCode}`))
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', i18n.t('flash.reservation.updated'))
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
