import BoatService, { BoatNotFoundError } from '#services/boat_service'
import NavigationLogService, { NavigationLogNotFoundError } from '#services/navigation_log_service'
import CrewRolePdfService from '#services/crew_role_pdf_service'
import CrewMember from '#models/crew_member'
import NavigationLogPolicy from '#policies/navigation_log_policy'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NavigationLogCrewRole } from '#shared/types/crew'

@inject()
export default class CrewRolePdfController {
  constructor(
    private boatService: BoatService,
    private navigationLogService: NavigationLogService,
    private pdfService: CrewRolePdfService
  ) {}

  async download({ response, auth, params, bouncer, i18n }: HttpContext) {
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

    let log
    try {
      log = await this.navigationLogService.getForBoat(boat, Number(params.logId))
    } catch (error) {
      if (error instanceof NavigationLogNotFoundError) {
        response.redirect(`/boats/${boat.id}?tab=navigation-logs`)
        return
      }
      throw error
    }

    await log.load('crew')

    const crewWithRoles = log.crew.map((member: CrewMember) => ({
      member,
      role: member.$extras.pivot_role as NavigationLogCrewRole,
    }))

    const { buffer, filename } = await this.pdfService.generate(log, crewWithRoles, i18n)

    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', `attachment; filename="${filename}"`)
    response.send(buffer)
  }
}
