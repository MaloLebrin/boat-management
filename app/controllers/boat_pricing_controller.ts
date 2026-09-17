import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import BoatHullService from '#services/boat_hull_service'
import { BoatNotFoundError } from '#exceptions/boat_errors'
import BoatPricingService from '#services/boat_pricing_service'
import { InvalidPricingRangeError } from '#exceptions/boat_pricing_errors'
import QuotaService from '#services/quota_service'
import BoatPolicy from '#policies/boat_policy'
import { upsertBoatPricingValidator } from '#validators/boat_pricing'

@inject()
export default class BoatPricingController {
  constructor(
    private boatService: BoatHullService,
    private pricingService: BoatPricingService,
    private quotaService: QuotaService
  ) {}

  async update({ params, request, response, auth, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await user.load('organization')

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.id))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        return response.redirect('/boats')
      }
      throw error
    }

    await this.quotaService.assertCanManagePricing(user.organization)

    await bouncer.with(BoatPolicy).authorize('manage', boat)

    const payload = await request.validateUsing(upsertBoatPricingValidator)

    try {
      await this.pricingService.upsert(user.organization, boat, payload)
    } catch (error) {
      if (error instanceof InvalidPricingRangeError) {
        session.flash('error', i18n.t('flash.pricing.invalidRange'))
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', i18n.t('flash.pricing.saved'))
    return response.redirect().back()
  }
}
