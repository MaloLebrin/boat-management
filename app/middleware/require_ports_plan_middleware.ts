import QuotaService from '#services/quota_service'
import { QuotaExceededError } from '#exceptions/quota_errors'
import { BILLING_SETTINGS_PATH } from '#shared/constants/billing'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Garde de plan sur toute la cartographie de port (#604) : ports, pontons,
 * mouillages et places. Le plan Starter — un ou deux bateaux personnels — n'a
 * pas de marina à modéliser, la section entière lui est fermée.
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
      if (error instanceof QuotaExceededError) {
        ctx.session.flash('error', ctx.i18n.t('flash.quota.portsExceeded'))
        return ctx.response.redirect(BILLING_SETTINGS_PATH)
      }
      throw error
    }

    return next()
  }
}
