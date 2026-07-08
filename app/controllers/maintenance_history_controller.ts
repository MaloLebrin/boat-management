import BoatMaintenanceService from '#services/boat_maintenance_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class MaintenanceHistoryController {
  constructor(private maintenanceService: BoatMaintenanceService) {}

  async index({ inertia, auth, request }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const { events, stats, filters, boatOptions } = await this.maintenanceService.getHistoryForOrg(
      user,
      request.qs()
    )

    return inertia.render('maintenance/history', { events, stats, filters, boatOptions })
  }
}
