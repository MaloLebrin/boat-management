import Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import type User from '#models/user'
import PortService from '#services/port_service'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type {
  DashboardBoatSummary,
  DashboardPlannedTasks,
  DashboardPortItem,
  DashboardPortStats,
  DashboardStatDeltas,
  DashboardStats,
  DashboardUrgentMaintenanceRow,
} from '#shared/types/dashboard'
import { PLANNED_TASKS_CAP, PLANNED_TASKS_DAYS } from '#shared/constants/dashboard_widgets'
import { isDueDateOverdue } from '#shared/helpers/maintenance'
import type { MaintenanceMaxDoneRow } from '#shared/types/maintenance'

@inject()
export default class DashboardService {
  constructor(private portService: PortService) {}

  async getForUser(
    user: User,
    opts?: {
      urgentWithinDays?: number
      urgentWithinEngineHours?: number
      urgentLimit?: number
    }
  ): Promise<{
    boats: DashboardBoatSummary[]
    /** Identifiants des bateaux de l'organisation — réutilisés par les autres services du tableau de bord (#832). */
    boatIds: number[]
    /** Lignes affichées (plafonnées à `urgentLimit`) ; `stats` compte toutes les tâches urgentes, sans plafond. */
    urgentMaintenance: DashboardUrgentMaintenanceRow[]
    stats: DashboardStats
    ports: DashboardPortItem[]
    portStats: DashboardPortStats
  }> {
    if (!user.organizationId) {
      const emptyDeltas: DashboardStatDeltas = { boatsInAlert: 0, overdueCount: 0 }
      return {
        boats: [],
        boatIds: [],
        urgentMaintenance: [],
        stats: {
          boats: 0,
          engines: 0,
          sails: 0,
          rigs: 0,
          urgentMaintenance: 0,
          deltas: emptyDeltas,
        },
        ports: [],
        portStats: { total: 0, totalBoats: 0, totalFreeSpots: 0 },
      }
    }

    const urgentWithinDays = opts?.urgentWithinDays ?? 14
    const urgentWithinEngineHours = opts?.urgentWithinEngineHours ?? 10
    const urgentLimit = opts?.urgentLimit ?? 10

    const boats = await Boat.query()
      .where('organizationId', user.organizationId)
      .preload('engines')
      .preload('sails')
      .preload('rig')
      .orderBy('id', 'desc')

    const boatSummary: DashboardBoatSummary[] = boats.map((b) => ({
      id: b.id,
      name: b.name,
      propulsionType: b.propulsionType,
      enginesCount: b.engines.length,
      sailsCount: b.sails.length,
      hasRig: b.rig !== null,
    }))

    const stats: DashboardStats = {
      boats: boats.length,
      engines: boats.reduce((acc, b) => acc + b.engines.length, 0),
      sails: boats.reduce((acc, b) => acc + b.sails.length, 0),
      rigs: boats.reduce((acc, b) => acc + (b.rig ? 1 : 0), 0),
      urgentMaintenance: 0,
      deltas: { boatsInAlert: 0, overdueCount: 0 },
    }

    const thresholdDate = DateTime.now().startOf('day').plus({ days: urgentWithinDays })

    const openTasks = await BoatMaintenanceTask.query()
      .where('status', 'open')
      .whereHas('boat', (q) => q.where('organizationId', user.organizationId!))
      .where((q) => {
        q.where((q2) => q2.whereNotNull('dueAt').where('dueAt', '<=', thresholdDate.toISODate()!))
        q.orWhereNotNull('dueEngineHours')
      })
      .preload('boat')
      .orderBy('dueAt', 'asc')
      .orderBy('id', 'desc')
    // Pas de `limit` : toutes les tâches candidates sont lues (quelques dizaines
    // par organisation) pour que `stats.urgentMaintenance` et `overdueCount`
    // soient exacts — le plafond `urgentLimit` ne s'applique qu'aux lignes
    // renvoyées pour l'affichage (#832). Les tâches en heures se filtrent en mémoire.

    const engineIds = Array.from(
      new Set(
        openTasks.map((t) => t.boatEngineId).filter((id): id is number => typeof id === 'number')
      )
    )

    const engines = engineIds.length
      ? await BoatEngine.query().whereIn('id', engineIds).select(['id', 'hours'])
      : []

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

    const allUrgent: DashboardUrgentMaintenanceRow[] = []

    for (const task of openTasks) {
      if (task.dueAt) {
        allUrgent.push({
          id: task.id,
          boatId: task.boatId,
          boatName: task.boat?.name ?? `#${task.boatId}`,
          subject: task.subject,
          title: task.title,
          kind: 'date',
          dueAt: task.dueAt.toISODate()!,
          dueEngineHours: null,
          currentEngineHours: null,
        })
        continue
      }

      if (task.dueEngineHours !== null && task.boatEngineId) {
        const current = engineHoursNow.get(task.boatEngineId) ?? null
        if (current === null) continue

        const remaining = task.dueEngineHours - current
        if (remaining <= urgentWithinEngineHours) {
          allUrgent.push({
            id: task.id,
            boatId: task.boatId,
            boatName: task.boat?.name ?? `#${task.boatId}`,
            subject: task.subject,
            title: task.title,
            kind: 'hours',
            dueAt: null,
            dueEngineHours: task.dueEngineHours,
            currentEngineHours: current,
          })
        }
      }
    }

    allUrgent.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'date' ? -1 : 1
      if (a.kind === 'date' && b.kind === 'date') {
        return (a.dueAt ?? '').localeCompare(b.dueAt ?? '')
      }
      // hours: sort by remaining asc
      const ar = (a.dueEngineHours ?? 0) - (a.currentEngineHours ?? 0)
      const br = (b.dueEngineHours ?? 0) - (b.currentEngineHours ?? 0)
      return ar - br
    })

    const urgentMaintenance = allUrgent.slice(0, urgentLimit)
    stats.urgentMaintenance = allUrgent.length

    const today = DateTime.now().startOf('day').toISODate()!
    const alertBoatIds = new Set(allUrgent.map((t) => t.boatId))
    stats.deltas = {
      boatsInAlert: alertBoatIds.size,
      overdueCount: allUrgent.filter(
        (t) => t.kind === 'date' && t.dueAt !== null && isDueDateOverdue(t.dueAt, today)
      ).length,
    }

    const allPorts = await this.portService.listForUser(user)
    const ports: DashboardPortItem[] = allPorts.map((p) => ({
      id: p.id,
      name: p.name,
      city: p.city,
      country: p.country,
      boatCount: p.boatCount,
      totalSpots: p.totalSpots,
      freeSpots: p.freeSpots,
    }))
    const portStats: DashboardPortStats = {
      total: ports.length,
      totalBoats: ports.reduce((acc, p) => acc + p.boatCount, 0),
      totalFreeSpots: ports.reduce((acc, p) => acc + p.freeSpots, 0),
    }

    return {
      boats: boatSummary,
      boatIds: boats.map((b) => b.id),
      urgentMaintenance,
      stats,
      ports,
      portStats,
    }
  }
  /**
   * Widget « Tâches planifiées » : tâches ouvertes **datées** dont l'échéance
   * tombe entre aujourd'hui et `PLANNED_TASKS_DAYS` jours, la plus proche
   * d'abord. Les retards sont exclus à dessein (ils vivent dans « À traiter »),
   * les tâches en heures moteur aussi (pas de date). Total exact par fonction
   * fenêtre, lignes plafonnées à `PLANNED_TASKS_CAP`.
   */
  async getPlannedTasks(
    boatIds: number[],
    opts?: { today?: DateTime; days?: number; limit?: number }
  ): Promise<DashboardPlannedTasks> {
    if (boatIds.length === 0) return { items: [], total: 0 }

    const today = (opts?.today ?? DateTime.now()).startOf('day')
    const until = today.plus({ days: opts?.days ?? PLANNED_TASKS_DAYS })

    const rows = await BoatMaintenanceTask.query()
      .whereIn('boatId', boatIds)
      .where('status', 'open')
      .whereNotNull('dueAt')
      .where('dueAt', '>=', today.toISODate()!)
      .where('dueAt', '<=', until.toISODate()!)
      .preload('boat', (q) => q.select(['id', 'name']))
      .select(['id', 'boatId', 'title', 'subject', 'dueAt'])
      .select(db.raw('count(*) over() as window_total'))
      .orderBy('dueAt', 'asc')
      .orderBy('id', 'desc')
      .limit(opts?.limit ?? PLANNED_TASKS_CAP)

    return {
      total: Number(rows[0]?.$extras.window_total ?? 0),
      items: rows.map((task) => ({
        id: task.id,
        boatId: task.boatId,
        boatName: task.boat?.name ?? `#${task.boatId}`,
        title: task.title,
        subject: task.subject,
        dueAt: task.dueAt!.toISODate()!,
      })),
    }
  }
}
