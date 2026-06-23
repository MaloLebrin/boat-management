import CrewService from '#services/crew_service'
import NavigationLogService, { NavigationLogNotFoundError } from '#services/navigation_log_service'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import NavigationLogPolicy from '#policies/navigation_log_policy'
import { syncNavigationLogCrewValidator } from '#validators/crew'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class NavigationLogCrewController {
  constructor(
    private boatService: BoatService,
    private navigationLogService: NavigationLogService,
    private crewService: CrewService
  ) {}

  async sync({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
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

    const payload = await request.validateUsing(syncNavigationLogCrewValidator)

    try {
      const log = await this.navigationLogService.getForBoat(boat, Number(params.logId))
      await this.crewService.syncCrewForNavigationLog(log, { crew: payload.crew })
    } catch (error) {
      if (error instanceof NavigationLogNotFoundError) {
        session.flash('error', i18n.t('flash.navigationLog.notFound'))
        response.redirect(`/boats/${boat.id}?tab=navigation-logs`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.crew.logCrewUpdated'))
    response.redirect(`/boats/${boat.id}?tab=navigation-logs`)
  }
}
