import BoatMaintenanceService from '#services/boat_maintenance_service'
import QuotaService from '#services/quota_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class MaintenanceHistoryController {
  constructor(
    private maintenanceService: BoatMaintenanceService,
    private quotaService: QuotaService
  ) {}

  async index({ inertia, auth, request }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await user.load('organization')

    const { events, stats, filters, boatOptions } = await this.maintenanceService.getHistoryForOrg(
      user,
      request.qs()
    )
    const canExport = user.organization ? this.quotaService.canExport(user.organization) : false

    return inertia.render('maintenance/history', { events, stats, filters, boatOptions, canExport })
  }
}
