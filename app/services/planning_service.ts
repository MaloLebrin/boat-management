import Boat from '#models/boat'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import BoatReservation from '#models/boat_reservation'
import Organization from '#models/organization'
import type User from '#models/user'
import TaskGroupingService from '#services/task_grouping_service'
import { toMaintenanceTaskWorkOrder } from '#transformers/maintenance_transformer'
import { PLAN_LIMITS } from '#shared/types/plan'
import type { PlanTier } from '#shared/types/plan'
import { taskOccupiedDays } from '#shared/helpers/planning_schedule'
import {
  PLANNING_DONE_TASKS_LIMIT,
  PLANNING_RESERVATIONS_FUTURE_DAYS,
  PLANNING_RESERVATIONS_PAST_DAYS,
  PLANNING_SOON_DAYS,
} from '#shared/types/planning'
import type { PlanningReservation, PlanningResult, PlanningTask } from '#shared/types/planning'
import type { FleetMaintenanceWindow } from '#shared/types/reservation'
import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

export type { PlanningResult }

/** Seuil « bientôt due » d'une tâche en heures moteur. */
const SOON_HOURS_THRESHOLD = 50

/** Champs d'une tâche qui suffisent à la classer en retard / bientôt due. */
type DueScoring = Pick<PlanningTask, 'kind' | 'dueAt' | 'dueEngineHours' | 'currentEngineHours'>

const EMPTY_PLANNING = (): PlanningResult => ({
  tasks: [],
  overdueTasks: [],
  soonTasks: [],
  plannedTasks: [],
  undatedTasks: [],
  doneTasks: [],
  doneTasksTotal: 0,
  doneTasksTotalByAssignee: {},
  groups: [],
  canGroupTasks: false,
  reservations: [],
})

export interface PlanningOptions {
  /**
   * Superpose les réservations de la flotte (#869). Au contrôleur de le
   * décider : module Location actif **et** droit de voir les bateaux.
   */
  includeReservations?: boolean
}

@inject()
export default class PlanningService {
  constructor(private taskGroupingService: TaskGroupingService) {}

  /**
   * Gets the planning data for all boats in an organization.
   */
  async getPlanningForOrg(user: User, options: PlanningOptions = {}): Promise<PlanningResult> {
    if (user.organizationId === null) {
      return EMPTY_PLANNING()
    }

    const boats = await Boat.query().where('organizationId', user.organizationId).preload('engines')

    const boatIds = boats.map((b) => b.id)
    const boatMap = new Map(boats.map((b) => [b.id, b]))

    if (boatIds.length === 0) {
      return EMPTY_PLANNING()
    }

    // Rang de chaque tâche terminée parmi celles de son assigné : garder les
    // N premières de chaque assigné couvre aussi le top N de la flotte.
    const rankedDoneTasks = db
      .from('boat_maintenance_tasks')
      .select('id')
      .select(
        db.raw('row_number() over (partition by assignee_id order by updated_at desc) as rank')
      )
      .whereIn('boat_id', boatIds)
      .where('status', 'done')

    const [org, rawTasks, rawDoneTasks, doneTotalsRows, reservations] = await Promise.all([
      Organization.findOrFail(user.organizationId),
      BoatMaintenanceTask.query()
        .whereIn('boatId', boatIds)
        .where('status', 'open')
        .preload('assignee', (q) => q.select('id', 'fullName', 'email'))
        .orderBy('dueAt', 'asc')
        .orderBy('dueEngineHours', 'asc'),
      BoatMaintenanceTask.query()
        .whereIn('boatId', boatIds)
        .whereIn(
          'id',
          db
            .from(rankedDoneTasks.as('ranked'))
            .where('rank', '<=', PLANNING_DONE_TASKS_LIMIT)
            .select('id')
        )
        .preload('assignee', (q) => q.select('id', 'fullName', 'email'))
        .orderBy('updatedAt', 'desc'),
      BoatMaintenanceTask.query()
        .whereIn('boatId', boatIds)
        .where('status', 'done')
        .select('assigneeId')
        .count('* as total')
        .groupBy('assigneeId'),
      options.includeReservations
        ? this.listReservations(boatIds, boatMap)
        : Promise.resolve<PlanningReservation[]>([]),
    ])

    const canGroupTasks = PLAN_LIMITS[org.plan as PlanTier].canGroupTasks

    const doneTasksTotalByAssignee: Record<string, number> = {}
    let doneTasksTotal = 0
    for (const row of doneTotalsRows) {
      const total = Number(row.$extras.total)
      doneTasksTotalByAssignee[row.assigneeId === null ? 'unassigned' : String(row.assigneeId)] =
        total
      doneTasksTotal += total
    }

    const today = DateTime.now().startOf('day')
    const soonDateThreshold = today.plus({ days: PLANNING_SOON_DAYS })

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
        postponedCount: t.postponedCount ?? 0,
        ...toMaintenanceTaskWorkOrder(t),
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
      const isSoon = this.isSoon(task, today, soonDateThreshold, SOON_HOURS_THRESHOLD)

      if (isOverdue) {
        overdueTasks.push(task)
      } else if (isSoon) {
        soonTasks.push(task)
      } else {
        plannedTasks.push(task)
      }
    }

    const groups = canGroupTasks ? this.taskGroupingService.group(plannedTasks) : []

    return {
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
    }
  }

  /**
   * Réservations `option`/`confirmed` de la flotte autour d'aujourd'hui,
   * superposées au planning (#869). Les annulées ne bloquent rien.
   */
  private async listReservations(
    boatIds: number[],
    boatMap: Map<number, Boat>
  ): Promise<PlanningReservation[]> {
    const now = DateTime.now()
    const rows = await BoatReservation.query()
      .select(['id', 'boatId', 'status', 'startsAt', 'endsAt', 'clientName'])
      .whereIn('boatId', boatIds)
      .whereIn('status', ['option', 'confirmed'])
      .where('endsAt', '>', now.minus({ days: PLANNING_RESERVATIONS_PAST_DAYS }).toISO()!)
      .where('startsAt', '<', now.plus({ days: PLANNING_RESERVATIONS_FUTURE_DAYS }).toISO()!)
      .orderBy('startsAt', 'asc')

    return rows.map((r) => ({
      id: r.id,
      boatId: r.boatId,
      boatName: boatMap.get(r.boatId)?.name ?? '',
      status: r.status as PlanningReservation['status'],
      startsAt: r.startsAt.toISO()!,
      endsAt: r.endsAt.toISO()!,
      clientName: r.clientName,
    }))
  }

  /**
   * Entretiens planifiés (tâches ouvertes datées) des bateaux donnés, rangés
   * par bateau : la couche « maintenance » de la frise `/reservations` (#869).
   * Les bateaux sont déjà ceux de l'organisation (listés par le contrôleur).
   */
  async maintenanceWindowsForBoats(
    boatIds: number[]
  ): Promise<Map<number, FleetMaintenanceWindow[]>> {
    const byBoat = new Map<number, FleetMaintenanceWindow[]>()
    if (boatIds.length === 0) return byBoat

    const today = DateTime.now().startOf('day')
    const tasks = await BoatMaintenanceTask.query()
      .select(['id', 'boatId', 'title', 'dueAt', 'estimatedDurationMinutes'])
      .whereIn('boatId', boatIds)
      .where('status', 'open')
      .whereNotNull('dueAt')
      .where('dueAt', '>=', today.minus({ days: PLANNING_RESERVATIONS_PAST_DAYS }).toISODate()!)
      .where('dueAt', '<=', today.plus({ days: PLANNING_RESERVATIONS_FUTURE_DAYS }).toISODate()!)
      .orderBy('dueAt', 'asc')

    for (const task of tasks) {
      if (!task.dueAt) continue
      const list = byBoat.get(task.boatId) ?? []
      list.push({
        taskId: task.id,
        title: task.title,
        ...taskOccupiedDays(task.dueAt.toISODate()!, task.estimatedDurationMinutes),
      })
      byBoat.set(task.boatId, list)
    }
    return byBoat
  }

  /**
   * Compte seul des tâches en retard / bientôt dues — même classement que
   * `getPlanningForOrg`, sans les tâches terminées, leur total, la ligne
   * organisation ni le groupement. Pour les appelants qui n'ont besoin que des
   * deux nombres (suggestions de démarrage du copilote).
   */
  async countDueTasksForOrg(user: User): Promise<{ overdue: number; soon: number }> {
    if (user.organizationId === null) return { overdue: 0, soon: 0 }

    const boats = await Boat.query()
      .select('id')
      .where('organizationId', user.organizationId)
      .preload('engines', (query) => query.select('id', 'boatId', 'hours'))

    if (boats.length === 0) return { overdue: 0, soon: 0 }

    const engineHours = new Map<number, number | null>()
    for (const boat of boats) {
      for (const engine of boat.engines) engineHours.set(engine.id, engine.hours)
    }

    const rawTasks = await BoatMaintenanceTask.query()
      .select('id', 'boatId', 'boatEngineId', 'dueAt', 'dueEngineHours')
      .whereIn(
        'boatId',
        boats.map((b) => b.id)
      )
      .where('status', 'open')

    const today = DateTime.now().startOf('day')
    const soonDateThreshold = today.plus({ days: PLANNING_SOON_DAYS })

    let overdue = 0
    let soon = 0
    for (const task of rawTasks) {
      const dueAt = task.dueAt ? task.dueAt.toISODate() : null
      if (dueAt === null && task.dueEngineHours === null) continue

      const scored: DueScoring = {
        kind: task.dueEngineHours !== null ? 'hours' : 'date',
        dueAt,
        dueEngineHours: task.dueEngineHours,
        currentEngineHours: task.boatEngineId ? (engineHours.get(task.boatEngineId) ?? null) : null,
      }

      if (this.isOverdue(scored, today)) overdue += 1
      else if (this.isSoon(scored, today, soonDateThreshold, SOON_HOURS_THRESHOLD)) soon += 1
    }

    return { overdue, soon }
  }

  private isOverdue(task: DueScoring, today: DateTime): boolean {
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
    task: DueScoring,
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
