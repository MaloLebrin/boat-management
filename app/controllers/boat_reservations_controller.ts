import {
  ReservationConflictError,
  ReservationNotFoundError,
  ReservationValidationError,
} from '#exceptions/reservation_errors'
import BoatReservationService from '#services/boat_reservation_service'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import BoatPolicy from '#policies/boat_policy'
import {
  createBoatReservationValidator,
  updateBoatReservationValidator,
} from '#validators/boat_reservation_validator'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { BoatReservationRow } from '#shared/types/reservation'

@inject()
export default class BoatReservationsController {
  constructor(
    private boatService: BoatService,
    private reservationService: BoatReservationService
  ) {}

  async index({ inertia, params, auth, bouncer, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) return response.redirect('/boats')
      throw error
    }

    await bouncer.with(BoatPolicy).authorize('view', boat)

    const [reservations, canManage] = await Promise.all([
      this.reservationService.listForBoat(user, boat),
      bouncer.with(BoatPolicy).allows('manage', boat),
    ])

    const rows: BoatReservationRow[] = reservations.map((r) => ({
      id: r.id,
      boatId: r.boatId,
      boatName: boat.name,
      organizationId: r.organizationId,
      status: r.status,
      startsAt: r.startsAt.toISO()!,
      endsAt: r.endsAt.toISO()!,
      clientName: r.clientName,
      clientEmail: r.clientEmail,
      clientPhone: r.clientPhone,
      notes: r.notes,
      totalPrice: r.totalPrice,
      createdAt: r.createdAt.toISO()!,
    }))

    return inertia.render('boats/reservations', {
      boat: { id: boat.id, name: boat.name },
      reservations: rows,
      canManage,
    })
  }

  async store({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) return response.redirect('/boats')
      throw error
    }

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

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) return response.redirect('/boats')
      throw error
    }

    await bouncer.with(BoatPolicy).authorize('manage', boat)

    const payload = await request.validateUsing(updateBoatReservationValidator)

    try {
      await this.reservationService.update(user, boat, Number(params.reservationId), {
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

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) return response.redirect('/boats')
      throw error
    }

    await bouncer.with(BoatPolicy).authorize('manage', boat)

    try {
      await this.reservationService.delete(user, boat, Number(params.reservationId))
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
