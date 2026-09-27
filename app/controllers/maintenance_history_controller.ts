import MaintenancePolicy from '#policies/maintenance_policy'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import QuotaService from '#services/quota_service'
import { boatOwnerPortalRedirect } from '#utils/staff_route_guard'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class MaintenanceHistoryController {
  constructor(
    private maintenanceService: BoatMaintenanceService,
    private quotaService: QuotaService
  ) {}

  async index({ inertia, auth, request, bouncer, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const portalRedirect = await boatOwnerPortalRedirect(user)
    if (portalRedirect) return response.redirect(portalRedirect)

    // Historique de toute la flotte : même seuil que la maintenance d'un bateau (#845).
    await bouncer.with(MaintenancePolicy).authorize('view')
    await user.load('organization')

    const { events, stats, filters, boatOptions } = await this.maintenanceService.getHistoryForOrg(
      user,
      request.qs()
    )
    const canExport = user.organization ? this.quotaService.canExport(user.organization) : false

    return inertia.render('maintenance/history', { events, stats, filters, boatOptions, canExport })
  }
}
