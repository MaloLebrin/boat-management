import { CalendarFeedNotFoundError } from '#exceptions/calendar_sync_errors'
import { BoatNotFoundError } from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import type User from '#models/user'
import BoatPolicy from '#policies/boat_policy'
import BoatHullService from '#services/boat_hull_service'
import CalendarFeedService from '#services/calendar_feed_service'
import {
  CALENDAR_FEED_TOKEN_PATTERN,
  ICAL_FEED_CACHE_SECONDS,
} from '#shared/constants/calendar_sync'
import { calendarFeedValidator } from '#validators/calendar_sync'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Flux iCal exportés (#880) : lecture publique par jeton, et gestion (créer,
 * régénérer, changer le contenu, révoquer) pour un bateau ou pour la flotte.
 */
@inject()
export default class CalendarFeedsController {
  constructor(
    private feedService: CalendarFeedService,
    private boatService: BoatHullService
  ) {}

  /**
   * `GET /calendar/:file` — sans session : l'agenda qui s'abonne n'a que
   * l'URL. Tout échec est un 404 muet, sans dire si le jeton a existé.
   */
  async show({ params, response }: HttpContext) {
    const file = String(params.file)
    const token = file.endsWith('.ics') ? file.slice(0, -4) : ''
    if (!CALENDAR_FEED_TOKEN_PATTERN.test(token)) return response.notFound('Not found')

    try {
      const body = await this.feedService.renderByToken(token)
      response.header('Content-Type', 'text/calendar; charset=utf-8')
      response.header('Content-Disposition', 'inline; filename="fleetai.ics"')
      response.header('Cache-Control', `private, max-age=${ICAL_FEED_CACHE_SECONDS}`)
      response.header('X-Robots-Tag', 'noindex')
      return response.send(body)
    } catch (error) {
      if (error instanceof CalendarFeedNotFoundError) return response.notFound('Not found')
      throw error
    }
  }

  async regenerateForBoat(ctx: HttpContext) {
    const boat = await this.manageableBoat(ctx)
    if (!boat) return
    const options = await this.options(ctx)
    await this.feedService.regenerate(ctx.auth.getUserOrFail(), boat.organizationId, boat, options)
    ctx.session.flash('success', ctx.i18n.t('flash.calendarSync.feedCreated'))
    return ctx.response.redirect().back()
  }

  async updateForBoat(ctx: HttpContext) {
    const boat = await this.manageableBoat(ctx)
    if (!boat) return
    const feed = await this.feedService.feedFor(boat.organizationId, boat.id)
    if (!feed) return ctx.response.redirect().back()
    await this.feedService.updateOptions(feed, await this.options(ctx))
    ctx.session.flash('success', ctx.i18n.t('flash.calendarSync.feedUpdated'))
    return ctx.response.redirect().back()
  }

  async revokeForBoat(ctx: HttpContext) {
    const boat = await this.manageableBoat(ctx)
    if (!boat) return
    await this.feedService.revoke(ctx.auth.getUserOrFail(), boat.organizationId, boat)
    ctx.session.flash('success', ctx.i18n.t('flash.calendarSync.feedRevoked'))
    return ctx.response.redirect().back()
  }

  async regenerateForFleet(ctx: HttpContext) {
    const user = await this.fleetManager(ctx)
    const options = await this.options(ctx)
    await this.feedService.regenerate(user, user.organizationId!, null, options)
    ctx.session.flash('success', ctx.i18n.t('flash.calendarSync.feedCreated'))
    return ctx.response.redirect().back()
  }

  async updateForFleet(ctx: HttpContext) {
    const user = await this.fleetManager(ctx)
    const feed = await this.feedService.feedFor(user.organizationId!, null)
    if (!feed) return ctx.response.redirect().back()
    await this.feedService.updateOptions(feed, await this.options(ctx))
    ctx.session.flash('success', ctx.i18n.t('flash.calendarSync.feedUpdated'))
    return ctx.response.redirect().back()
  }

  async revokeForFleet(ctx: HttpContext) {
    const user = await this.fleetManager(ctx)
    await this.feedService.revoke(user, user.organizationId!, null)
    ctx.session.flash('success', ctx.i18n.t('flash.calendarSync.feedRevoked'))
    return ctx.response.redirect().back()
  }

  private async options(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(calendarFeedValidator)
    return {
      includeClientName: payload.includeClientName ?? false,
      includeMaintenance: payload.includeMaintenance ?? false,
    }
  }

  private async fleetManager({ auth, bouncer }: HttpContext): Promise<User> {
    const user = auth.getUserOrFail()
    await bouncer.with(BoatPolicy).authorize('manageFleetCalendar')
    return user
  }

  private async manageableBoat({ auth, params, bouncer, response }: HttpContext) {
    const user = auth.getUserOrFail()
    let boat: Boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return null
      }
      throw error
    }
    await bouncer.with(BoatPolicy).authorize('manage', boat)
    return boat
  }
}
