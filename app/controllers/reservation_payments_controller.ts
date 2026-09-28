import { ReservationNotFoundError, ReservationPaymentError } from '#exceptions/reservation_errors'
import BoatPolicy from '#policies/boat_policy'
import BoatContextService from '#services/boat_context_service'
import ReservationPaymentService from '#services/reservation_payment_service'
import {
  recordReservationPaymentValidator,
  settleSecurityDepositValidator,
} from '#validators/reservation_payment'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Argent d'une location (#875) : encaissements (acompte, solde,
 * remboursement) et caution. Même garde que la modification de la
 * réservation — `boats.manage` sur le bateau, module Location actif.
 */
@inject()
export default class ReservationPaymentsController {
  constructor(
    private boatContext: BoatContextService,
    private paymentService: ReservationPaymentService
  ) {}

  async update(ctx: HttpContext) {
    const { request, response, bouncer, session, i18n } = ctx
    await ctx.auth.authenticate()
    const loaded = await this.boatContext.resolveBoatAndReservation(ctx)
    if (!loaded) return
    const { user, boat, reservation } = loaded

    await bouncer.with(BoatPolicy).authorize('manage', boat)
    const payload = await request.validateUsing(recordReservationPaymentValidator)

    try {
      await this.paymentService.recordPayment(user, reservation, payload)
    } catch (error) {
      if (this.flashError(error, session, i18n)) return response.redirect().back()
      throw error
    }

    session.flash('success', i18n.t(`flash.reservation.payment.recorded.${payload.kind}`))
    return response.redirect().back()
  }

  async securityDeposit(ctx: HttpContext) {
    const { request, response, bouncer, session, i18n } = ctx
    await ctx.auth.authenticate()
    const loaded = await this.boatContext.resolveBoatAndReservation(ctx)
    if (!loaded) return
    const { user, boat, reservation } = loaded

    await bouncer.with(BoatPolicy).authorize('manage', boat)
    const payload = await request.validateUsing(settleSecurityDepositValidator)

    try {
      await this.paymentService.settleSecurityDeposit(user, reservation, payload)
    } catch (error) {
      if (this.flashError(error, session, i18n)) return response.redirect().back()
      throw error
    }

    session.flash('success', i18n.t(`flash.reservation.payment.securityDeposit.${payload.action}`))
    return response.redirect().back()
  }

  private flashError(
    error: unknown,
    session: HttpContext['session'],
    i18n: HttpContext['i18n']
  ): boolean {
    if (error instanceof ReservationPaymentError) {
      session.flash('error', i18n.t(`flash.reservation.payment.errors.${error.errorCode}`))
      return true
    }
    if (error instanceof ReservationNotFoundError) {
      session.flash('error', i18n.t('flash.reservation.notFound'))
      return true
    }
    return false
  }
}
