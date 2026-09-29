import {
  ExternalCalendarLimitError,
  ExternalCalendarNotFoundError,
  ExternalCalendarSyncError,
} from '#exceptions/calendar_sync_errors'
import { BoatNotFoundError } from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import BoatPolicy from '#policies/boat_policy'
import BoatHullService from '#services/boat_hull_service'
import ExternalCalendarService from '#services/external_calendar_service'
import type { ExternalCalendarSyncResult } from '#shared/types/calendar_sync'
import { addExternalCalendarValidator } from '#validators/calendar_sync'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Calendriers externes importés sur un bateau (#880) : ajout (avec première
 * synchronisation), synchronisation à la demande, retrait.
 */
@inject()
export default class ExternalCalendarsController {
  constructor(
    private externalCalendarService: ExternalCalendarService,
    private boatService: BoatHullService
  ) {}

  async store(ctx: HttpContext) {
    const boat = await this.manageableBoat(ctx)
    if (!boat) return
    const payload = await ctx.request.validateUsing(addExternalCalendarValidator)

    try {
      const { result } = await this.externalCalendarService.add(
        ctx.auth.getUserOrFail(),
        boat,
        payload
      )
      this.flashResult(ctx, result, 'added')
    } catch (error) {
      if (error instanceof ExternalCalendarSyncError) {
        ctx.session.flash('error', ctx.i18n.t('flash.calendarSync.unsafeUrl'))
      } else if (error instanceof ExternalCalendarLimitError) {
        ctx.session.flash(
          'error',
          ctx.i18n.t('flash.calendarSync.limitReached', { limit: String(error.limit) })
        )
      } else {
        throw error
      }
    }
    return ctx.response.redirect().back()
  }

  async sync(ctx: HttpContext) {
    const boat = await this.manageableBoat(ctx)
    if (!boat) return
    try {
      const calendar = await this.externalCalendarService.findForBoat(
        boat,
        Number(ctx.params.calendarId)
      )
      this.flashResult(ctx, await this.externalCalendarService.sync(calendar), 'synced')
    } catch (error) {
      if (!(error instanceof ExternalCalendarNotFoundError)) throw error
    }
    return ctx.response.redirect().back()
  }

  async destroy(ctx: HttpContext) {
    const boat = await this.manageableBoat(ctx)
    if (!boat) return
    try {
      await this.externalCalendarService.remove(
        ctx.auth.getUserOrFail(),
        boat,
        Number(ctx.params.calendarId)
      )
      ctx.session.flash('success', ctx.i18n.t('flash.calendarSync.removed'))
    } catch (error) {
      if (!(error instanceof ExternalCalendarNotFoundError)) throw error
    }
    return ctx.response.redirect().back()
  }

  private flashResult(
    { session, i18n }: HttpContext,
    result: ExternalCalendarSyncResult,
    kind: 'added' | 'synced'
  ) {
    if (!result.ok) {
      session.flash(
        'error',
        i18n.t('flash.calendarSync.syncFailed', {
          reason: i18n.t(`reservations.calendarSync.errors.${result.error}`),
        })
      )
      return
    }
    session.flash(
      'success',
      i18n.t(`flash.calendarSync.${kind}`, { count: String(result.eventCount) })
    )
    if (result.conflictCount > 0) {
      session.flash(
        'error',
        i18n.t('flash.calendarSync.conflicts', { count: String(result.conflictCount) })
      )
    }
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
