import Boat from '#models/boat'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import type User from '#models/user'
import type { PlanningTask } from '#shared/types/planning'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

export interface PlanningResult {
  tasks: PlanningTask[]
  overdueTasks: PlanningTask[]
  soonTasks: PlanningTask[]
  plannedTasks: PlanningTask[]
}

@inject()
export default class PlanningService {
  /**
   * Gets the planning data for all boats in an organization.
   */
  async getPlanningForOrg(user: User): Promise<PlanningResult> {
    if (user.organizationId === null) {
      return { tasks: [], overdueTasks: [], soonTasks: [], plannedTasks: [] }
    }

    const boats = await Boat.query().where('organizationId', user.organizationId).preload('engines')

    const boatIds = boats.map((b) => b.id)
    const boatMap = new Map(boats.map((b) => [b.id, b]))

    if (boatIds.length === 0) {
      return { tasks: [], overdueTasks: [], soonTasks: [], plannedTasks: [] }
    }

    const rawTasks = await BoatMaintenanceTask.query()
      .whereIn('boatId', boatIds)
      .where('status', 'open')
      .orderBy('dueAt', 'asc')
      .orderBy('dueEngineHours', 'asc')

    const today = DateTime.now().startOf('day')
    const soonDateThreshold = today.plus({ days: 30 })
    const soonHoursThreshold = 50

    const tasks: PlanningTask[] = rawTasks.map((t) => {
      const boat = boatMap.get(t.boatId)!
      const engine = t.boatEngineId ? boat.engines.find((e) => e.id === t.boatEngineId) : null
      const currentEngineHours = engine?.hours ?? null

      return {
        id: t.id,
        boatId: t.boatId,
        boatName: boat.name,
        title: t.title,
        subject: t.subject,
        kind: t.dueEngineHours !== null ? 'hours' : 'date',
        dueAt: t.dueAt ? t.dueAt.toISODate() : null,
        dueEngineHours: t.dueEngineHours,
        currentEngineHours,
        status: t.status as 'open' | 'done',
      }
    })

    const overdueTasks: PlanningTask[] = []
    const soonTasks: PlanningTask[] = []
    const plannedTasks: PlanningTask[] = []

    for (const task of tasks) {
      const isOverdue = this.isOverdue(task, today)
      const isSoon = this.isSoon(task, today, soonDateThreshold, soonHoursThreshold)

      if (isOverdue) {
        overdueTasks.push(task)
      } else if (isSoon) {
        soonTasks.push(task)
      } else {
        plannedTasks.push(task)
      }
    }

    return { tasks, overdueTasks, soonTasks, plannedTasks }
  }

  private isOverdue(task: PlanningTask, today: DateTime): boolean {
    if (task.kind === 'date' && task.dueAt) {
      const dueDate = DateTime.fromISO(task.dueAt)
      return dueDate < today
    }

    if (task.kind === 'hours' && task.dueEngineHours !== null && task.currentEngineHours !== null) {
      return task.currentEngineHours >= task.dueEngineHours
    }

    return false
  }

  private isSoon(
    task: PlanningTask,
    today: DateTime,
    soonDateThreshold: DateTime,
    soonHoursThreshold: number
  ): boolean {
    if (task.kind === 'date' && task.dueAt) {
      const dueDate = DateTime.fromISO(task.dueAt)
      return dueDate >= today && dueDate <= soonDateThreshold
    }

    if (task.kind === 'hours' && task.dueEngineHours !== null && task.currentEngineHours !== null) {
      const hoursRemaining = task.dueEngineHours - task.currentEngineHours
      return hoursRemaining > 0 && hoursRemaining <= soonHoursThreshold
    }

    return false
  }
}
