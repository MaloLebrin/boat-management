import PricingSeasonService, {
  PricingSeasonNotFoundError,
  SeasonOverlapError,
  InvalidSeasonDateRangeError,
  InvalidSeasonPriceError,
  SeasonBoatNotFoundError,
} from '#services/pricing_season_service'
import QuotaService from '#services/quota_service'
import { QuotaExceededError } from '#exceptions/quota_errors'
import PricingSeasonPolicy from '#policies/pricing_season_policy'
import {
  createPricingSeasonValidator,
  updatePricingSeasonValidator,
} from '#validators/pricing_season'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type Organization from '#models/organization'

@inject()
export default class PricingSeasonsController {
  constructor(
    private pricingSeasonService: PricingSeasonService,
    private quotaService: QuotaService
  ) {}

  private async loadOrgAndAssertEnterprise({
    auth,
    session,
    response,
    i18n,
  }: Pick<HttpContext, 'auth' | 'session' | 'response' | 'i18n'>): Promise<Organization | null> {
    const user = auth.getUserOrFail()
    await user.load('organization')

    try {
      await this.quotaService.assertCanManagePricing(user.organization)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t('flash.quota.pricingExceeded'))
        response.redirect('/')
        return null
      }
      throw error
    }

    return user.organization
  }

  async index({ inertia, auth, bouncer, request, session, response, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgAndAssertEnterprise({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(PricingSeasonPolicy).authorize('create')

    const filters = this.pricingSeasonService.normalizeFilters(request.qs())
    const seasons = await this.pricingSeasonService.list(org, filters)
    const boatOptions = await this.pricingSeasonService.listBoatOptions(org)
    const canDelete = await bouncer.with(PricingSeasonPolicy).allows('delete')

    return inertia.render('pricing/seasons/index', { seasons, boatOptions, filters, canDelete })
  }

  async store({ request, response, auth, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgAndAssertEnterprise({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(PricingSeasonPolicy).authorize('create')

    const payload = await request.validateUsing(createPricingSeasonValidator)

    try {
      await this.pricingSeasonService.create(org, {
        boatId: payload.boatId,
        name: payload.name,
        startsOn: payload.startsOn.toISODate()!,
        endsOn: payload.endsOn.toISODate()!,
        dailyPrice: payload.dailyPrice,
        multiplier: payload.multiplier,
        priority: payload.priority,
      })
    } catch (error) {
      if (error instanceof SeasonOverlapError) {
        session.flash('error', i18n.t('flash.pricingSeason.overlap'))
        return response.redirect().back()
      }
      if (error instanceof InvalidSeasonDateRangeError) {
        session.flash('error', i18n.t('flash.pricingSeason.invalidRange'))
        return response.redirect().back()
      }
      if (error instanceof InvalidSeasonPriceError) {
        session.flash('error', i18n.t('flash.pricingSeason.invalidPrice'))
        return response.redirect().back()
      }
      if (error instanceof SeasonBoatNotFoundError) {
        session.flash('error', i18n.t('flash.pricingSeason.boatNotFound'))
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', i18n.t('flash.pricingSeason.created'))
    response.redirect('/pricing/seasons')
  }

  async update({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgAndAssertEnterprise({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(PricingSeasonPolicy).authorize('update')

    let season
    try {
      season = await this.pricingSeasonService.getForOrganizationOrFail(org, Number(params.id))
    } catch (error) {
      if (error instanceof PricingSeasonNotFoundError) {
        session.flash('error', i18n.t('flash.pricingSeason.notFound'))
        return response.redirect('/pricing/seasons')
      }
      throw error
    }

    const payload = await request.validateUsing(updatePricingSeasonValidator)

    try {
      await this.pricingSeasonService.update(season, {
        boatId: payload.boatId,
        name: payload.name,
        startsOn: payload.startsOn.toISODate()!,
        endsOn: payload.endsOn.toISODate()!,
        dailyPrice: payload.dailyPrice,
        multiplier: payload.multiplier,
        priority: payload.priority,
      })
    } catch (error) {
      if (error instanceof SeasonOverlapError) {
        session.flash('error', i18n.t('flash.pricingSeason.overlap'))
        return response.redirect().back()
      }
      if (error instanceof InvalidSeasonDateRangeError) {
        session.flash('error', i18n.t('flash.pricingSeason.invalidRange'))
        return response.redirect().back()
      }
      if (error instanceof InvalidSeasonPriceError) {
        session.flash('error', i18n.t('flash.pricingSeason.invalidPrice'))
        return response.redirect().back()
      }
      if (error instanceof SeasonBoatNotFoundError) {
        session.flash('error', i18n.t('flash.pricingSeason.boatNotFound'))
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', i18n.t('flash.pricingSeason.updated'))
    response.redirect('/pricing/seasons')
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgAndAssertEnterprise({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(PricingSeasonPolicy).authorize('delete')

    try {
      const season = await this.pricingSeasonService.getForOrganizationOrFail(
        org,
        Number(params.id)
      )
      await this.pricingSeasonService.delete(season)
    } catch (error) {
      if (error instanceof PricingSeasonNotFoundError) {
        session.flash('error', i18n.t('flash.pricingSeason.notFound'))
        return response.redirect('/pricing/seasons')
      }
      throw error
    }

    session.flash('success', i18n.t('flash.pricingSeason.deleted'))
    response.redirect('/pricing/seasons')
  }
}
