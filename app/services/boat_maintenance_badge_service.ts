import BoatEngine from '#models/boat_engine'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import type {
  BoatMaintenanceBadge,
  MaintenanceBadgeOpts,
  MaintenanceDateBadgeRow,
  MaintenanceMaxDoneRow,
} from '#shared/types/maintenance'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export type { BoatMaintenanceBadge }

@inject()
export default class BoatMaintenanceBadgeService {
  async getForBoatIds(
    organizationId: number,
    boatIds: number[],
    opts?: MaintenanceBadgeOpts
  ): Promise<Map<number, BoatMaintenanceBadge>> {
    const result = new Map<number, BoatMaintenanceBadge>()
    if (boatIds.length === 0) return result

    const urgentWithinDays = opts?.urgentWithinDays ?? 14
    const urgentWithinEngineHours = opts?.urgentWithinEngineHours ?? 10

    const startOfToday = DateTime.now().startOf('day')
    const thresholdDate = startOfToday.plus({ days: urgentWithinDays })

    // Date-based tasks: nextDueAt + urgentCount (overdue) + upcomingCount (within threshold)
    const dateRows = await db
      .from('boat_maintenance_tasks')
      .where('status', 'open')
      .whereIn('boat_id', boatIds)
      .whereNotNull('due_at')
      .whereExists((q) => {
        q.from('boats')
          .whereColumn('boats.id', 'boat_maintenance_tasks.boat_id')
          .where('boats.organization_id', organizationId)
      })
      .groupBy('boat_id')
      .select('boat_id as boatId')
      .min('due_at as nextDueAt')
      .count('* as openDateTasks')

    // We still need urgent/upcoming counts, which depend on threshold. Do a second grouped query
    // to avoid DB-specific CASE syntax and keep it portable.
    const dateTasks = await BoatMaintenanceTask.query()
      .where('status', 'open')
      .whereIn('boatId', boatIds)
      .whereNotNull('dueAt')
      .whereHas('boat', (q) => q.where('organizationId', organizationId))
      .select(['boatId', 'dueAt'])

    for (const row of dateRows as MaintenanceDateBadgeRow[]) {
      const boatId = Number(row.boatId)
      result.set(boatId, {
        urgentCount: 0,
        upcomingCount: 0,
        nextDueAt: row.nextDueAt ? String(row.nextDueAt) : null,
      })
    }

    for (const task of dateTasks) {
      const boatId = task.boatId
      const badge = result.get(boatId) ?? { urgentCount: 0, upcomingCount: 0, nextDueAt: null }
      const due = task.dueAt
      if (due) {
        if (badge.nextDueAt === null || due.toISODate()! < badge.nextDueAt) {
          badge.nextDueAt = due.toISODate()
        }
        if (due <= startOfToday) badge.urgentCount += 1
        else if (due <= thresholdDate) badge.upcomingCount += 1
      }
      result.set(boatId, badge)
    }

    // Engine-hour tasks: mark urgent when remaining <= urgentWithinEngineHours.
    const hourTasks = await BoatMaintenanceTask.query()
      .where('status', 'open')
      .whereIn('boatId', boatIds)
      .whereNotNull('dueEngineHours')
      .whereNotNull('boatEngineId')
      .whereHas('boat', (q) => q.where('organizationId', organizationId))
      .select(['boatId', 'boatEngineId', 'dueEngineHours'])

    const engineIds = Array.from(
      new Set(
        hourTasks.map((t) => t.boatEngineId).filter((id): id is number => typeof id === 'number')
      )
    )

    const engines =
      engineIds.length === 0
        ? []
        : await BoatEngine.query().whereIn('id', engineIds).select(['id', 'hours'])

    const maxDoneRows: MaintenanceMaxDoneRow[] =
      engineIds.length === 0
        ? []
        : await db
            .from('boat_maintenance_tasks')
            .where('status', 'done')
            .whereIn('boat_engine_id', engineIds)
            .whereNotNull('done_engine_hours')
            .groupBy('boat_engine_id')
            .select('boat_engine_id as boatEngineId')
            .max('done_engine_hours as maxDone')
    const maxDoneByEngine = new Map(
      maxDoneRows.map((r) => [Number(r.boatEngineId), Number(r.maxDone)])
    )

    const engineHoursNow = new Map<number, number | null>()
    for (const e of engines) {
      const fallback = maxDoneByEngine.get(e.id)
      const current =
        e.hours ?? (fallback === undefined || Number.isNaN(fallback) ? null : fallback)
      engineHoursNow.set(e.id, current)
    }

    for (const task of hourTasks) {
      if (!task.boatEngineId || task.dueEngineHours === null) continue
      const current = engineHoursNow.get(task.boatEngineId) ?? null
      if (current === null) continue

      const remaining = task.dueEngineHours - current
      if (remaining > urgentWithinEngineHours) continue

      const boatId = task.boatId
      const badge = result.get(boatId) ?? { urgentCount: 0, upcomingCount: 0, nextDueAt: null }
      badge.urgentCount += 1
      result.set(boatId, badge)
    }

    return result
  }
}
