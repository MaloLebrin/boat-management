import NavigationLogEntryService from '#services/navigation_log_entry_service'
import {
  NavigationLogEntryNotEditableError,
  NavigationLogEntryNotFoundError,
  NavigationLogNotFoundError,
  NavigationLogValidationError,
} from '#exceptions/navigation_log_errors'
import NavigationLogPolicy from '#policies/navigation_log_policy'
import {
  createNavigationLogEntryValidator,
  updateNavigationLogEntryValidator,
} from '#validators/navigation_log'
import { CREATE_NAVIGATION_LOG_ENTRY_ACTION } from '#shared/constants/offline_queue'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import BoatContextService from '#services/boat_context_service'

@inject()
export default class NavigationLogEntriesController {
  constructor(
    private boatContext: BoatContextService,
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

    let entry
    try {
      entry = await this.entryService.createForLog(
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
      // Le refus qui coûte le plus cher : un équipier saisit ses points en mer,
      // le skipper clôture la sortie depuis le quai, et chaque point refusé
      // était **jeté** au retour du réseau, sans trace, sous un toast de succès
      // (#727).
      if (this.flashKnownError(error, session, i18n, CREATE_NAVIGATION_LOG_ENTRY_ACTION)) {
        response.redirect().back()
        return
      }
      throw error
    }

    session.flash('createdResourceType', CREATE_NAVIGATION_LOG_ENTRY_ACTION)
    session.flash('createdResourceId', String(entry.id))
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
    await ctx.auth.authenticate()
    const resolved = await this.boatContext.resolveBoat(ctx)
    return resolved?.boat ?? null
  }

  /**
   * `rejectedType` n'est posé que pour les chemins **enfilés hors-ligne** : la
   * création (#727). `update` et `destroy` passent ici sans identifiant — le
   * verrou de l'édition est l'objet de #725.
   */
  private flashKnownError(
    error: unknown,
    session: HttpContext['session'],
    i18n: HttpContext['i18n'],
    rejectedType?: string
  ): boolean {
    const reject = (key: string) => {
      session.flash('error', i18n.t(key))
      if (rejectedType) session.flash('rejectedType', rejectedType)
      return true
    }

    if (error instanceof NavigationLogNotFoundError) {
      return reject('flash.navigationLog.notFound')
    }
    if (error instanceof NavigationLogEntryNotFoundError) {
      return reject('flash.navigationLogEntry.notFound')
    }
    if (error instanceof NavigationLogEntryNotEditableError) {
      return reject('flash.navigationLogEntry.notEditable')
    }
    if (error instanceof NavigationLogValidationError) {
      return reject(`flash.navigationLogEntry.${error.errorCode}`)
    }
    return false
  }
}
