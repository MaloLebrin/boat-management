import BoatPolicy from '#policies/boat_policy'
import MaintenancePolicy from '#policies/maintenance_policy'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import CrewService from '#services/crew_service'
import PlanningService from '#services/planning_service'
import QuotaService from '#services/quota_service'
import { boatOwnerPortalRedirect } from '#utils/staff_route_guard'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class PlanningController {
  constructor(
    private planningService: PlanningService,
    private taskService: BoatMaintenanceTaskService,
    private quotaService: QuotaService,
    private crewService: CrewService
  ) {}

  async index({ inertia, auth, bouncer, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const portalRedirect = await boatOwnerPortalRedirect(user)
    if (portalRedirect) return response.redirect(portalRedirect)

    // Toutes les tâches de la flotte : même seuil que la maintenance d'un bateau (#845).
    await bouncer.with(MaintenancePolicy).authorize('view')

    // Bandes de réservations (#869) : module Location actif, et droit de voir
    // les bateaux — sans lui le lien vers `/boats/:id/reservations` répondrait 403.
    await user.load('organization')
    const includeReservations =
      user.organization !== null &&
      (await this.quotaService.canManageReservations(user.organization)) &&
      (await bouncer.with(BoatPolicy).allows('view'))

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
      reservations,
    } = await this.planningService.getPlanningForOrg(user, { includeReservations })
    // Filtre « Assigné à » (#868).
    const maintenanceAssignees = await this.taskService.listAssignees(user)
    // Filtre « Équipier » (#883) : seulement quand les réservations sont superposées.
    const crewMembers = includeReservations
      ? await this.crewService.listOptionsForOrganization(user.organization!)
      : []
    const crewOptions = crewMembers.map((m) => ({ id: m.id, fullName: m.fullName }))

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
      reservations,
      maintenanceAssignees,
      crewOptions,
    })
  }
}
