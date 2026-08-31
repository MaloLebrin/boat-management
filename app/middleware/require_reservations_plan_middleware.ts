import QuotaService from '#services/quota_service'
import { QuotaExceededError } from '#exceptions/quota_errors'
import { BILLING_SETTINGS_PATH } from '#shared/constants/billing'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Garde de module sur le domaine réservations (#595) : calendrier flotte,
 * réservations par bateau, états des lieux et contrats de location. Le
 * catalogue de l'offre modulaire (docs/offre-modulaire.md) range tout ce
 * périmètre dans le module Location (charter) — inclus en Entreprise,
 * add-on sur Pro — mais seul le tarif saisonnier était gaté jusqu'ici.
 *
 * Posée sur les groupes de routes plutôt que dupliquée dans les contrôleurs
 * (`Reservations`, `BoatReservations`, `BoatInspections`, `RentalContracts`) :
 * une route ajoutée au groupe est gardée d'office. À monter **après**
 * `middleware.auth()`, dont elle dépend pour `auth.getUserOrFail()`.
 */
@inject()
export default class RequireReservationsPlanMiddleware {
  constructor(private quotaService: QuotaService) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.getUserOrFail()
    await user.load('organization')

    try {
      await this.quotaService.assertCanManageReservations(user.organization)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        ctx.session.flash('error', ctx.i18n.t('flash.quota.reservationsExceeded'))
        return ctx.response.redirect(BILLING_SETTINGS_PATH)
      }
      throw error
    }

    return next()
  }
}
