import BoatMaintenanceService from '#services/boat_maintenance_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class MaintenanceHistoryController {
  constructor(private maintenanceService: BoatMaintenanceService) {}

  async index({ inertia, auth }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const { events, stats } = await this.maintenanceService.getHistoryForOrg(user)

    return inertia.render('maintenance/history', { events, stats })
  }
}
