import NavigationLogEntryService from '#services/navigation_log_entry_service'
import {
  NavigationLogEntryNotEditableError,
  NavigationLogEntryNotFoundError,
  NavigationLogNotFoundError,
  NavigationLogValidationError,
} from '#exceptions/navigation_log_errors'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import NavigationLogPolicy from '#policies/navigation_log_policy'
import {
  createNavigationLogEntryValidator,
  updateNavigationLogEntryValidator,
} from '#validators/navigation_log'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class NavigationLogEntriesController {
  constructor(
    private boatService: BoatService,
    private entryService: NavigationLogEntryService
  ) {}

  async store(ctx: HttpContext) {
    const { request, response, bouncer, session, i18n } = ctx
    const boat = await this.loadBoat(ctx)
    if (!boat) return

    await bouncer.with(NavigationLogPolicy).authorize('update', boat)
    // La correction d'une sortie clôturée est réservée aux profils qui peuvent
    // supprimer une sortie (admin) — cas réel : rectifier le dernier point avec
    // la position du port après un oubli de clôture.
    const allowCompleted = await bouncer.with(NavigationLogPolicy).allows('delete')

    const payload = await request.validateUsing(createNavigationLogEntryValidator)

    try {
      await this.entryService.createForLog(
        boat,
        Number(ctx.params.logId),
        {
          recordedAt: payload.recordedAt,
          tzOffsetMinutes: payload.tzOffsetMinutes,
          latitude: payload.latitude ?? null,
          longitude: payload.longitude ?? null,
          gpsAccuracyM: payload.gpsAccuracyM ?? null,
          cogDeg: payload.cogDeg ?? null,
          sogKn: payload.sogKn ?? null,
          sailConfig: payload.sailConfig ?? null,
          note: payload.note ?? null,
        },
        { allowCompleted }
      )
    } catch (error) {
      if (this.flashKnownError(error, session, i18n)) {
        response.redirect().back()
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.navigationLogEntry.created'))
    response.redirect().back()
  }

  async update(ctx: HttpContext) {
    const { request, response, bouncer, session, i18n } = ctx
    const boat = await this.loadBoat(ctx)
    if (!boat) return

    await bouncer.with(NavigationLogPolicy).authorize('update', boat)
    const allowCompleted = await bouncer.with(NavigationLogPolicy).allows('delete')

    const payload = await request.validateUsing(updateNavigationLogEntryValidator)

    try {
      await this.entryService.updateForLog(
        boat,
        Number(ctx.params.logId),
        Number(ctx.params.entryId),
        // Pass values through as-is (no `?? null`): the service preserves fields
        // that are `undefined` and only writes those explicitly provided (a null
        // clears the value). See #180.
        {
          recordedAt: payload.recordedAt,
          tzOffsetMinutes: payload.tzOffsetMinutes,
          latitude: payload.latitude,
          longitude: payload.longitude,
          gpsAccuracyM: payload.gpsAccuracyM,
          cogDeg: payload.cogDeg,
          sogKn: payload.sogKn,
          sailConfig: payload.sailConfig,
          note: payload.note,
        },
        { allowCompleted }
      )
    } catch (error) {
      if (this.flashKnownError(error, session, i18n)) {
        response.redirect().back()
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.navigationLogEntry.updated'))
    response.redirect().back()
  }

  async destroy(ctx: HttpContext) {
    const { response, bouncer, session, i18n } = ctx
    const boat = await this.loadBoat(ctx)
    if (!boat) return

    await bouncer.with(NavigationLogPolicy).authorize('update', boat)
    const allowCompleted = await bouncer.with(NavigationLogPolicy).allows('delete')

    try {
      await this.entryService.deleteForLog(
        boat,
        Number(ctx.params.logId),
        Number(ctx.params.entryId),
        { allowCompleted }
      )
    } catch (error) {
      if (this.flashKnownError(error, session, i18n)) {
        response.redirect().back()
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.navigationLogEntry.deleted'))
    response.redirect().back()
  }

  private async loadBoat(ctx: HttpContext) {
    const { response, auth, params } = ctx
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      return await this.boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return null
      }
      throw error
    }
  }

  private flashKnownError(
    error: unknown,
    session: HttpContext['session'],
    i18n: HttpContext['i18n']
  ): boolean {
    if (error instanceof NavigationLogNotFoundError) {
      session.flash('error', i18n.t('flash.navigationLog.notFound'))
      return true
    }
    if (error instanceof NavigationLogEntryNotFoundError) {
      session.flash('error', i18n.t('flash.navigationLogEntry.notFound'))
      return true
    }
    if (error instanceof NavigationLogEntryNotEditableError) {
      session.flash('error', i18n.t('flash.navigationLogEntry.notEditable'))
      return true
    }
    if (error instanceof NavigationLogValidationError) {
      session.flash('error', i18n.t(`flash.navigationLogEntry.${error.errorCode}`))
      return true
    }
    return false
  }
}
