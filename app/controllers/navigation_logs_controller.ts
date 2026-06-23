import NavigationLogService from '#services/navigation_log_service'
import {
  NavigationLogNotFoundError,
  NavigationLogValidationError,
} from '#exceptions/navigation_log_errors'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import NavigationLogPolicy from '#policies/navigation_log_policy'
import {
  createNavigationLogValidator,
  closeNavigationLogValidator,
  updateNavigationLogValidator,
} from '#validators/navigation_log'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class NavigationLogsController {
  constructor(
    private boatService: BoatService,
    private navigationLogService: NavigationLogService
  ) {}

  async store({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }

    await bouncer.with(NavigationLogPolicy).authorize('create', boat)

    const payload = await request.validateUsing(createNavigationLogValidator)

    await this.navigationLogService.createForBoat(boat, {
      departedAt: payload.departedAt,
      departurePortId: payload.departurePortId ?? null,
      departurePortName: payload.departurePortName ?? null,
      engineHoursStart: payload.engineHoursStart ?? null,
      windForceBeaufort: payload.windForceBeaufort ?? null,
      seaState: payload.seaState ?? null,
      crewCount: payload.crewCount ?? null,
      notes: payload.notes ?? null,
    })

    session.flash('success', i18n.t('flash.navigationLog.created'))
    response.redirect(`/boats/${boat.id}?tab=navigation-logs`)
  }

  async update({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }

    await bouncer.with(NavigationLogPolicy).authorize('update', boat)

    const payload = await request.validateUsing(updateNavigationLogValidator)

    try {
      await this.navigationLogService.updateForBoat(boat, Number(params.logId), {
        windForceBeaufort: payload.windForceBeaufort ?? null,
        seaState: payload.seaState ?? null,
        crewCount: payload.crewCount ?? null,
        notes: payload.notes ?? null,
      })
    } catch (error) {
      if (error instanceof NavigationLogNotFoundError) {
        session.flash('error', i18n.t('flash.navigationLog.notFound'))
        response.redirect().back()
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.navigationLog.updated'))
    response.redirect().back()
  }

  async close({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }

    await bouncer.with(NavigationLogPolicy).authorize('update', boat)

    const payload = await request.validateUsing(closeNavigationLogValidator)

    try {
      await this.navigationLogService.closeTrip(boat, Number(params.logId), {
        arrivedAt: payload.arrivedAt,
        arrivalPortId: payload.arrivalPortId ?? null,
        arrivalPortName: payload.arrivalPortName ?? null,
        distanceNm: payload.distanceNm ?? null,
        engineHoursEnd: payload.engineHoursEnd ?? null,
        fuelConsumedLiters: payload.fuelConsumedLiters ?? null,
        windForceBeaufort: payload.windForceBeaufort ?? null,
        seaState: payload.seaState ?? null,
        crewCount: payload.crewCount ?? null,
        notes: payload.notes ?? null,
      })
    } catch (error) {
      if (error instanceof NavigationLogNotFoundError) {
        session.flash('error', i18n.t('flash.navigationLog.notFound'))
        response.redirect(`/boats/${boat.id}?tab=navigation-logs`)
        return
      }
      if (error instanceof NavigationLogValidationError) {
        session.flash('error', i18n.t(`flash.navigationLog.${error.errorCode}`))
        response.redirect(`/boats/${boat.id}?tab=navigation-logs`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.navigationLog.closed'))
    response.redirect(`/boats/${boat.id}?tab=navigation-logs`)
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }

    await bouncer.with(NavigationLogPolicy).authorize('delete')

    try {
      await this.navigationLogService.deleteForBoat(boat, Number(params.logId))
    } catch (error) {
      if (error instanceof NavigationLogNotFoundError) {
        session.flash('error', i18n.t('flash.navigationLog.notFound'))
        response.redirect(`/boats/${boat.id}?tab=navigation-logs`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.navigationLog.deleted'))
    response.redirect(`/boats/${boat.id}?tab=navigation-logs`)
  }
}
