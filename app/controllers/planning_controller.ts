import PlanningService from '#services/planning_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class PlanningController {
  constructor(private planningService: PlanningService) {}

  async index({ inertia, auth }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const { tasks, overdueTasks, soonTasks, plannedTasks } =
      await this.planningService.getPlanningForOrg(user)

    return inertia.render('planning/index', {
      tasks,
      overdueTasks,
      soonTasks,
      plannedTasks,
    })
  }
}
