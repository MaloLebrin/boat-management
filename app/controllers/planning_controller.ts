import MaintenancePolicy from '#policies/maintenance_policy'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import PlanningService from '#services/planning_service'
import { boatOwnerPortalRedirect } from '#utils/staff_route_guard'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class PlanningController {
  constructor(
    private planningService: PlanningService,
    private taskService: BoatMaintenanceTaskService
  ) {}

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
      doneTasksTotalByAssignee,
      groups,
      canGroupTasks,
    } = await this.planningService.getPlanningForOrg(user)
    // Filtre « Assigné à » (#868).
    const maintenanceAssignees = await this.taskService.listAssignees(user)

    return inertia.render('planning/index', {
      tasks,
      overdueTasks,
      soonTasks,
      plannedTasks,
      undatedTasks,
      doneTasks,
      doneTasksTotal,
      doneTasksTotalByAssignee,
      groups,
      canGroupTasks,
      maintenanceAssignees,
    })
  }
}
