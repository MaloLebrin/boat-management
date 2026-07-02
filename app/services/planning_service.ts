import Boat from '#models/boat'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import Organization from '#models/organization'
import type User from '#models/user'
import type { PlanningResult, PlanningTask } from '#shared/types/planning'
import { PLAN_LIMITS } from '#shared/types/plan'
import type { PlanTier } from '#shared/types/plan'
import TaskGroupingService from '#services/task_grouping_service'
import { PLAN_LIMITS } from '#shared/types/plan'
import type { PlanningResult, PlanningTask } from '#shared/types/planning'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

export type { PlanningResult }

@inject()
export default class PlanningService {
  constructor(private taskGroupingService: TaskGroupingService) {}

  /**
   * Gets the planning data for all boats in an organization.
   */
  async getPlanningForOrg(user: User): Promise<PlanningResult> {
    if (user.organizationId === null) {
      return {
        tasks: [],
        overdueTasks: [],
        soonTasks: [],
        plannedTasks: [],
        undatedTasks: [],
        doneTasks: [],
        doneTasksTotal: 0,
        groups: [],
        canGroupTasks: false,
      }
    }

    const boats = await Boat.query().where('organizationId', user.organizationId).preload('engines')

    const boatIds = boats.map((b) => b.id)
    const boatMap = new Map(boats.map((b) => [b.id, b]))

    if (boatIds.length === 0) {
      return {
        tasks: [],
        overdueTasks: [],
        soonTasks: [],
        plannedTasks: [],
        undatedTasks: [],
        doneTasks: [],
        doneTasksTotal: 0,
        groups: [],
        canGroupTasks: false,
      }
    }

    const [org, rawTasks, rawDoneTasks, doneTasksTotalRow] = await Promise.all([
      Organization.findOrFail(user.organizationId),
      BoatMaintenanceTask.query()
        .whereIn('boatId', boatIds)
        .where('status', 'open')
        .orderBy('dueAt', 'asc')
        .orderBy('dueEngineHours', 'asc'),
      BoatMaintenanceTask.query()
        .whereIn('boatId', boatIds)
        .where('status', 'done')
        .orderBy('updatedAt', 'desc')
        .limit(20),
      BoatMaintenanceTask.query()
        .whereIn('boatId', boatIds)
        .where('status', 'done')
        .count('* as total'),
    ])

    const canGroupTasks = PLAN_LIMITS[org.plan as PlanTier].canGroupTasks

    const doneTasksTotal = Number(doneTasksTotalRow[0].$extras.total)

    const today = DateTime.now().startOf('day')
    const soonDateThreshold = today.plus({ days: 30 })
    const soonHoursThreshold = 50

    const toTask = (t: BoatMaintenanceTask): PlanningTask => {
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
    }

    const tasks: PlanningTask[] = rawTasks.map(toTask)
    const doneTasks: PlanningTask[] = rawDoneTasks.map(toTask)

    const overdueTasks: PlanningTask[] = []
    const soonTasks: PlanningTask[] = []
    const plannedTasks: PlanningTask[] = []
    const undatedTasks: PlanningTask[] = []

    for (const task of tasks) {
      // Tasks without dueAt or dueEngineHours go to undatedTasks
      if (task.dueAt === null && task.dueEngineHours === null) {
        undatedTasks.push(task)
        continue
      }

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

    const groups = canGroupTasks ? this.taskGroupingService.group(plannedTasks) : []

    return { tasks, overdueTasks, soonTasks, plannedTasks, undatedTasks, doneTasks, doneTasksTotal, groups, canGroupTasks }
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
