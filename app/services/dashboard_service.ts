import Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import type User from '#models/user'
import PortService from '#services/port_service'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export type DashboardPortItem = {
  id: number
  name: string
  city: string | null
  country: string | null
  boatCount: number
  totalSpots: number
  freeSpots: number
}

export type DashboardPortStats = {
  total: number
  totalBoats: number
  totalFreeSpots: number
}

export type DashboardBoatSummary = {
  id: number
  name: string
  propulsionType: string | null
  enginesCount: number
  sailsCount: number
  hasRig: boolean
}

export type DashboardUrgentMaintenanceRow = {
  id: number
  boatId: number
  boatName: string
  subject: string
  title: string
  kind: 'date' | 'hours'
  dueAt: string | null
  dueEngineHours: number | null
  currentEngineHours: number | null
}

export type DashboardStats = {
  boats: number
  engines: number
  sails: number
  rigs: number
  urgentMaintenance: number
}

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
    urgentMaintenance: DashboardUrgentMaintenanceRow[]
    stats: DashboardStats
    ports: DashboardPortItem[]
    portStats: DashboardPortStats
  }> {
    if (user.organizationId === null) {
      return {
        boats: [],
        urgentMaintenance: [],
        stats: { boats: 0, engines: 0, sails: 0, rigs: 0, urgentMaintenance: 0 },
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
      .limit(urgentLimit * 3) // we filter hours-based in-memory

    const engineIds = Array.from(
      new Set(
        openTasks.map((t) => t.boatEngineId).filter((id): id is number => typeof id === 'number')
      )
    )

    const engines = engineIds.length
      ? await BoatEngine.query().whereIn('id', engineIds).select(['id', 'hours'])
      : []

    const maxDoneByEngine =
      engineIds.length === 0
        ? new Map<number, number>()
        : new Map(
            (
              await db
                .from('boat_maintenance_tasks')
                .where('status', 'done')
                .whereIn('boat_engine_id', engineIds)
                .whereNotNull('done_engine_hours')
                .groupBy('boat_engine_id')
                .select('boat_engine_id as boatEngineId')
                .max('done_engine_hours as maxDone')
            ).map((r: any) => [Number(r.boatEngineId), Number(r.maxDone)])
          )

    const engineHoursNow = new Map<number, number | null>()
    for (const e of engines) {
      const fallback = maxDoneByEngine.get(e.id)
      const current =
        e.hours ?? (fallback === undefined || Number.isNaN(fallback) ? null : fallback)
      engineHoursNow.set(e.id, current)
    }

    const urgentMaintenance: DashboardUrgentMaintenanceRow[] = []

    for (const task of openTasks) {
      if (urgentMaintenance.length >= urgentLimit) break

      if (task.dueAt) {
        urgentMaintenance.push({
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
          urgentMaintenance.push({
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

    urgentMaintenance.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'date' ? -1 : 1
      if (a.kind === 'date' && b.kind === 'date') {
        return (a.dueAt ?? '').localeCompare(b.dueAt ?? '')
      }
      // hours: sort by remaining asc
      const ar = (a.dueEngineHours ?? 0) - (a.currentEngineHours ?? 0)
      const br = (b.dueEngineHours ?? 0) - (b.currentEngineHours ?? 0)
      return ar - br
    })

    stats.urgentMaintenance = urgentMaintenance.length

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

    return { boats: boatSummary, urgentMaintenance, stats, ports, portStats }
  }
}
