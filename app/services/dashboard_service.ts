import Boat from '#models/boat'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import type User from '#models/user'
import { DateTime } from 'luxon'

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
  dueAt: string
  performedAt: string
}

export type DashboardStats = {
  boats: number
  engines: number
  sails: number
  rigs: number
  urgentMaintenance: number
}

export default class DashboardService {
  async getForUser(
    user: User,
    opts?: {
      urgentWithinDays?: number
      urgentLimit?: number
    }
  ): Promise<{
    boats: DashboardBoatSummary[]
    urgentMaintenance: DashboardUrgentMaintenanceRow[]
    stats: DashboardStats
  }> {
    if (user.organizationId === null) {
      return {
        boats: [],
        urgentMaintenance: [],
        stats: { boats: 0, engines: 0, sails: 0, rigs: 0, urgentMaintenance: 0 },
      }
    }

    const urgentWithinDays = opts?.urgentWithinDays ?? 14
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

    const threshold = DateTime.now().startOf('day').plus({ days: urgentWithinDays })

    const urgentEvents = await BoatMaintenanceEvent.query()
      .whereNotNull('dueAt')
      .where('dueAt', '<=', threshold.toISODate()!)
      .whereHas('boat', (q) => q.where('organizationId', user.organizationId!))
      .preload('boat')
      .orderBy('dueAt', 'asc')
      .limit(urgentLimit)

    const urgentMaintenance: DashboardUrgentMaintenanceRow[] = urgentEvents.map((ev) => ({
      id: ev.id,
      boatId: ev.boatId,
      boatName: ev.boat?.name ?? `#${ev.boatId}`,
      subject: ev.subject,
      title: ev.title,
      dueAt: ev.dueAt!.toISODate()!,
      performedAt: ev.performedAt.toISODate()!,
    }))

    stats.urgentMaintenance = urgentMaintenance.length

    return { boats: boatSummary, urgentMaintenance, stats }
  }
}
