import MaintenancePolicy from '#policies/maintenance_policy'
import PlanningService from '#services/planning_service'
import { boatOwnerPortalRedirect } from '#utils/staff_route_guard'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class PlanningController {
  constructor(private planningService: PlanningService) {}

  async index({ inertia, auth, bouncer, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const portalRedirect = await boatOwnerPortalRedirect(user)
    if (portalRedirect) return response.redirect(portalRedirect)

    // Toutes les tâches de la flotte : même seuil que la maintenance d'un bateau (#845).
    await bouncer.with(MaintenancePolicy).authorize('view')

    const {
      tasks,
      overdueTasks,
      soonTasks,
      plannedTasks,
      undatedTasks,
      doneTasks,
      doneTasksTotal,
      groups,
      canGroupTasks,
    } = await this.planningService.getPlanningForOrg(user)

    return inertia.render('planning/index', {
      tasks,
      overdueTasks,
      soonTasks,
      plannedTasks,
      undatedTasks,
      doneTasks,
      doneTasksTotal,
      groups,
      canGroupTasks,
    })
  }
}
