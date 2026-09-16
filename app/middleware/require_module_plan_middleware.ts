import QuotaService from '#services/quota_service'
import { QuotaExceededError } from '#exceptions/quota_errors'
import { BILLING_SETTINGS_PATH } from '#shared/constants/billing'
import type { ModulePlanFeature } from '#shared/types/plan'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type Organization from '#models/organization'

/**
 * Garde de module unique (vague 1.3), paramétrée par la capacité gardée :
 * `middleware.requireModulePlan({ feature: 'invoices' })`.
 *
 * Remplace `RequireReservationsPlanMiddleware` (#595) et les copies
 * `loadOrgForWrite` des contrôleurs clients, factures et périodes tarifaires :
 * une route ajoutée au groupe est gardée d'office, avec la même sortie
 * partout — flash `flash.quota.<feature>Exceeded` et redirection vers la
 * facturation (upsell). Un utilisateur sans organisation (#279) lève
 * `UserNotInOrganizationError` dans `QuotaService`, traduite par le handler
 * global.
 *
 * Les lectures résiduelles après résiliation (#332 : index/fiche clients et
 * factures encore consultables) restent hors du groupe gardé — le contrôleur
 * décide en fonction des données existantes.
 *
 * À monter **après** `middleware.auth()`, dont elle dépend pour
 * `auth.getUserOrFail()`.
 */
@inject()
export default class RequireModulePlanMiddleware {
  constructor(private quotaService: QuotaService) {}

  async handle(ctx: HttpContext, next: NextFn, options: { feature: ModulePlanFeature }) {
    const user = ctx.auth.getUserOrFail()
    await user.load('organization')

    try {
      await this.assert(options.feature, user.organization)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        ctx.session.flash('error', ctx.i18n.t(`flash.quota.${options.feature}Exceeded`))
        return ctx.response.redirect(BILLING_SETTINGS_PATH)
      }
      throw error
    }

    return next()
  }

  private assert(feature: ModulePlanFeature, org: Organization | null): Promise<void> {
    switch (feature) {
      case 'clients':
        return this.quotaService.assertCanManageClients(org)
      case 'invoices':
        return this.quotaService.assertCanManageInvoices(org)
      case 'pricing':
        return this.quotaService.assertCanManagePricing(org)
      case 'reservations':
        return this.quotaService.assertCanManageReservations(org)
    }
  }
}
