import QuotaService from '#services/quota_service'
import { QuotaExceededError } from '#exceptions/quota_errors'
import { PortsUnavailableForPrivateProfileError } from '#exceptions/port_errors'
import { BILLING_SETTINGS_PATH } from '#shared/constants/billing'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Garde de plan et de profil sur toute la cartographie de port (#604) : ports,
 * pontons, mouillages et places. Le plan Starter — un ou deux bateaux
 * personnels — n'a pas de marina à modéliser, la section entière lui est
 * fermée ; il en va de même, quel que soit son plan, d'une organisation
 * déclarée particulier à l'inscription.
 *
 * Les deux refus ne mènent pas au même endroit : un plan trop bas renvoie vers
 * la facturation avec un upsell, un profil particulier vers le dashboard —
 * aucun abonnement ne lui ouvrira la section.
 *
 * Posée sur le groupe de routes plutôt que dupliquée dans les quatre
 * contrôleurs (`Ports`, `Pontoons`, `Mouillages`, `Spots`) : une route ajoutée
 * au groupe est gardée d'office. À monter **après** `middleware.auth()`, dont
 * elle dépend pour `auth.getUserOrFail()`.
 */
@inject()
export default class RequirePortsPlanMiddleware {
  constructor(private quotaService: QuotaService) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.getUserOrFail()
    await user.load('organization')

    try {
      this.quotaService.assertCanManagePorts(user.organization)
    } catch (error) {
      if (error instanceof PortsUnavailableForPrivateProfileError) {
        ctx.session.flash('error', ctx.i18n.t('flash.ports.unavailableForPrivateProfile'))
        return ctx.response.redirect('/dashboard')
      }
      if (error instanceof QuotaExceededError) {
        ctx.session.flash('error', ctx.i18n.t('flash.quota.portsExceeded'))
        return ctx.response.redirect(BILLING_SETTINGS_PATH)
      }
      throw error
    }

    return next()
  }
}
