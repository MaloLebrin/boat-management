import NavigationLog from '#models/navigation_log'
import type User from '#models/user'
import EngineListService from '#services/engine_list_service'
import { ACTIVE_TRIPS_DISPLAY_CAP, PULSE_WINDOW_DAYS } from '#shared/constants/dashboard'
import type {
  DashboardActiveTrips,
  DashboardFleetStatus,
  DashboardPulseStats,
} from '#shared/types/dashboard'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

/**
 * Ce qui se passe dans la flotte (#832) : sorties en cours, état de flotte
 * (en mer / au port / moteurs en maintenance) et compteurs glissants sur
 * `PULSE_WINDOW_DAYS` jours. Toutes les requêtes sont des agrégats indexés
 * (`navigation_logs(organization_id, status)`, `boat_maintenance_tasks(boat_id, status)`).
 */
@inject()
export default class DashboardFleetActivityService {
  constructor(private engineListService: EngineListService) {}

  /** Sorties en cours, la plus ancienne d'abord ; total par fonction fenêtre (une requête). */
  async getActiveTrips(user: User): Promise<DashboardActiveTrips> {
    if (!user.organizationId) return { items: [], total: 0 }

    const rows = await NavigationLog.query()
      .where('organizationId', user.organizationId)
      .where('status', 'in_progress')
      .preload('boat', (q) => q.select(['id', 'name']))
      .select('*')
      .select(db.raw('count(*) over() as window_total'))
      .orderBy('departedAt', 'asc')
      .orderBy('id', 'asc')
      .limit(ACTIVE_TRIPS_DISPLAY_CAP)

    return {
      total: Number(rows[0]?.$extras.window_total ?? 0),
      items: rows.map((log) => ({
        id: log.id,
        boatId: log.boatId,
        boatName: log.boat?.name ?? `#${log.boatId}`,
        departedAt: log.departedAt.toISO()!,
        departurePortName: log.departurePortName,
        crewCount: log.crewCount,
      })),
    }
  }

  /**
   * `atSea` vient des sorties en cours (une seule par bateau, index partiel
   * unique) ; le reste de la flotte est réputé au port.
   */
  async getFleetStatus(boatIds: number[], atSea: number): Promise<DashboardFleetStatus> {
    const engines = await this.engineListService.summaryForBoats(boatIds)
    const total = boatIds.length
    return {
      total,
      atSea: Math.min(atSea, total),
      inPort: Math.max(total - atSea, 0),
      enginesInMaintenance: engines.inMaintenance,
    }
  }

  /** Sorties terminées et tâches réalisées sur la fenêtre glissante. */
  async getPulse(
    user: User,
    boatIds: number[],
    now: DateTime = DateTime.now()
  ): Promise<DashboardPulseStats> {
    const empty: DashboardPulseStats = {
      windowDays: PULSE_WINDOW_DAYS,
      tripsCompleted: 0,
      distanceNm: 0,
      tasksDone: 0,
    }
    if (!user.organizationId || boatIds.length === 0) return empty

    const since = now.minus({ days: PULSE_WINDOW_DAYS })

    const [trips, tasks] = await Promise.all([
      db
        .from('navigation_logs')
        .where('organization_id', user.organizationId)
        .where('status', 'completed')
        .where('arrived_at', '>=', since.toISO()!)
        .select(db.raw('count(*)::int as total'))
        .select(db.raw('coalesce(sum(distance_nm), 0) as nm'))
        .first(),
      db
        .from('boat_maintenance_tasks')
        .whereIn('boat_id', boatIds)
        .where('status', 'done')
        .where('done_at', '>=', since.toISODate()!)
        .count('* as total')
        .first(),
    ])

    return {
      windowDays: PULSE_WINDOW_DAYS,
      tripsCompleted: Number(trips?.total ?? 0),
      distanceNm: Math.round(Number.parseFloat(String(trips?.nm ?? '0')) * 10) / 10,
      tasksDone: Number(tasks?.total ?? 0),
    }
  }
}
