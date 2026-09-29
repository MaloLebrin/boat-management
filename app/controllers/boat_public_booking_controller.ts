import { BoatNotFoundError } from '#exceptions/boat_errors'
import BoatPolicy from '#policies/boat_policy'
import BoatHullService from '#services/boat_hull_service'
import PublicBookingService from '#services/public_booking_service'
import { publicBookingSettingsValidator } from '#validators/public_booking'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Ouverture de la page publique de réservation d'un bateau (#881), depuis son
 * onglet Réservations. Gardé par le module réservations (groupe de routes) et
 * par le droit de gérer le bateau.
 */
@inject()
export default class BoatPublicBookingController {
  constructor(
    private boatService: BoatHullService,
    private bookingService: PublicBookingService
  ) {}

  async update({ auth, params, request, response, bouncer, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) return response.redirect('/boats')
      throw error
    }
    await bouncer.with(BoatPolicy).authorize('manage', boat)

    const { enabled } = await request.validateUsing(publicBookingSettingsValidator)
    await this.bookingService.setEnabled(boat, enabled)

    session.flash(
      'success',
      i18n.t(enabled ? 'flash.publicBooking.enabled' : 'flash.publicBooking.disabled')
    )
    return response.redirect().back()
  }
}
