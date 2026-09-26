import BoatDocument from '#models/boat_document'
import Boat from '#models/boat'
import BoatFuelLog from '#models/boat_fuel_log'
import BoatIncident from '#models/boat_incident'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import NavigationLog from '#models/navigation_log'
import type User from '#models/user'
import EngineListService from '#services/engine_list_service'
import {
  ACTIVE_TRIPS_DISPLAY_CAP,
  ACTIVITY_DISPLAY_CAP,
  PULSE_WINDOW_DAYS,
} from '#shared/constants/dashboard'
import { FUEL_WINDOW_DAYS } from '#shared/constants/dashboard_widgets'
import type {
  DashboardActiveTrips,
  DashboardActivityItem,
  DashboardFleetStatus,
  DashboardFuelSummary,
  DashboardPulseStats,
} from '#shared/types/dashboard'
import type { IncidentType } from '#shared/types/incident'
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

  /**
   * Widget « Carburant » : litres, coût et prix moyen au litre des pleins de
   * la fenêtre glissante, comparés à la fenêtre précédente de même durée, plus
   * le bateau qui a le plus avitaillé. Trois agrégats bornés sur
   * `boat_fuel_logs`. Ne renvoie jamais `null` (#478).
   */
  async getFuelSummary(
    user: User,
    boatIds: number[],
    now: DateTime = DateTime.now()
  ): Promise<DashboardFuelSummary> {
    const empty: DashboardFuelSummary = {
      windowDays: FUEL_WINDOW_DAYS,
      liters: 0,
      cost: 0,
      avgPricePerLiter: null,
      fillUps: 0,
      previous: null,
      topBoat: null,
    }
    const orgId = user.organizationId
    if (!orgId || boatIds.length === 0) return empty

    const today = now.toISODate()!
    const since = now.minus({ days: FUEL_WINDOW_DAYS }).toISODate()!
    const before = now.minus({ days: FUEL_WINDOW_DAYS * 2 }).toISODate()!

    const aggregate = (from: string, to: string, inclusiveEnd: boolean) =>
      db
        .from('boat_fuel_logs')
        .where('organization_id', orgId)
        .whereIn('boat_id', boatIds)
        .where('fueled_at', '>=', from)
        .where('fueled_at', inclusiveEnd ? '<=' : '<', to)
        .select(db.raw('coalesce(sum(quantity_liters), 0) as liters'))
        .select(db.raw('coalesce(sum(total_cost), 0) as cost'))
        .select(db.raw('count(*)::int as fill_ups'))
        .select(
          db.raw(
            'coalesce(sum(quantity_liters) filter (where total_cost is not null), 0) as priced_liters'
          )
        )
        .first()

    const [current, previous, top] = await Promise.all([
      aggregate(since, today, true),
      aggregate(before, since, false),
      db
        .from('boat_fuel_logs')
        .where('organization_id', orgId)
        .whereIn('boat_id', boatIds)
        .where('fueled_at', '>=', since)
        .where('fueled_at', '<=', today)
        .groupBy('boat_id')
        .select('boat_id')
        .select(db.raw('sum(quantity_liters) as liters'))
        .orderBy('liters', 'desc')
        .orderBy('boat_id', 'asc')
        .first(),
    ])

    const toNumber = (value: unknown, digits: number) =>
      Math.round(Number.parseFloat(String(value ?? '0')) * 10 ** digits) / 10 ** digits

    const liters = toNumber(current?.liters, 1)
    const cost = toNumber(current?.cost, 2)
    const pricedLiters = toNumber(current?.priced_liters, 3)
    const previousFillUps = Number(previous?.fill_ups ?? 0)

    let topBoat: DashboardFuelSummary['topBoat'] = null
    if (top) {
      const boat = await Boat.query()
        .where('id', Number(top.boat_id))
        .select(['id', 'name'])
        .first()
      topBoat = {
        boatId: Number(top.boat_id),
        boatName: boat?.name ?? `#${top.boat_id}`,
        liters: toNumber(top.liters, 1),
      }
    }

    return {
      windowDays: FUEL_WINDOW_DAYS,
      liters,
      cost,
      avgPricePerLiter: pricedLiters > 0 ? Math.round((cost / pricedLiters) * 1000) / 1000 : null,
      fillUps: Number(current?.fill_ups ?? 0),
      previous:
        previousFillUps > 0
          ? { liters: toNumber(previous?.liters, 1), cost: toNumber(previous?.cost, 2) }
          : null,
      topBoat,
    }
  }

  /**
   * Fil des derniers événements de la flotte (prop différée) : cinq requêtes
   * bornées à `limit`, fusionnées en mémoire et triées du plus récent au plus
   * ancien. Ne renvoie jamais `null` (#478).
   */
  async getRecentActivity(
    user: User,
    boatIds: number[],
    limit: number = ACTIVITY_DISPLAY_CAP
  ): Promise<DashboardActivityItem[]> {
    const orgId = user.organizationId
    if (!orgId || boatIds.length === 0) return []

    const [trips, tasks, incidents, fuelLogs, documents] = await Promise.all([
      NavigationLog.query()
        .where('organizationId', orgId)
        .where('status', 'completed')
        .whereNotNull('arrivedAt')
        .preload('boat', (q) => q.select(['id', 'name']))
        .orderBy('arrivedAt', 'desc')
        .orderBy('id', 'desc')
        .limit(limit),
      BoatMaintenanceTask.query()
        .whereIn('boatId', boatIds)
        .where('status', 'done')
        .whereNotNull('doneAt')
        .preload('boat', (q) => q.select(['id', 'name']))
        .orderBy('doneAt', 'desc')
        .orderBy('id', 'desc')
        .limit(limit),
      BoatIncident.query()
        .where('organizationId', orgId)
        .preload('boat', (q) => q.select(['id', 'name']))
        .orderBy('createdAt', 'desc')
        .orderBy('id', 'desc')
        .limit(limit),
      BoatFuelLog.query()
        .where('organizationId', orgId)
        .preload('boat', (q) => q.select(['id', 'name']))
        .orderBy('createdAt', 'desc')
        .orderBy('id', 'desc')
        .limit(limit),
      BoatDocument.query()
        .where('organizationId', orgId)
        .preload('boat', (q) => q.select(['id', 'name']))
        .orderBy('createdAt', 'desc')
        .orderBy('id', 'desc')
        .limit(limit),
    ])

    const items: DashboardActivityItem[] = [
      ...trips.map(
        (log): DashboardActivityItem => ({
          kind: 'trip_completed',
          key: `trip:${log.id}`,
          occurredAt: log.arrivedAt!.toISO()!,
          boatId: log.boatId,
          boatName: log.boat?.name ?? `#${log.boatId}`,
          href: `/boats/${log.boatId}/navigation`,
          departurePortName: log.departurePortName,
          arrivalPortName: log.arrivalPortName,
          distanceNm: log.distanceNm !== null ? Number.parseFloat(log.distanceNm) : null,
        })
      ),
      ...tasks.map(
        (task): DashboardActivityItem => ({
          kind: 'task_done',
          key: `task:${task.id}`,
          occurredAt: task.doneAt!.toISO()!,
          boatId: task.boatId,
          boatName: task.boat?.name ?? `#${task.boatId}`,
          href: `/planning?task=${task.id}`,
          title: task.title,
          subject: task.subject,
        })
      ),
      ...incidents.map(
        (incident): DashboardActivityItem => ({
          kind: 'incident_reported',
          key: `incident:${incident.id}`,
          occurredAt: incident.createdAt.toISO()!,
          boatId: incident.boatId,
          boatName: incident.boat?.name ?? `#${incident.boatId}`,
          href: `/boats/${incident.boatId}/incidents/${incident.id}`,
          incidentType: incident.type as IncidentType,
        })
      ),
      ...fuelLogs.map(
        (log): DashboardActivityItem => ({
          kind: 'fuel_logged',
          key: `fuel:${log.id}`,
          occurredAt: log.createdAt.toISO()!,
          boatId: log.boatId,
          boatName: log.boat?.name ?? `#${log.boatId}`,
          href: '/navigation/fuel',
          quantityLiters: Number.parseFloat(String(log.quantityLiters)),
          totalCost: log.totalCost !== null ? Number.parseFloat(String(log.totalCost)) : null,
        })
      ),
      ...documents.map(
        (doc): DashboardActivityItem => ({
          kind: 'document_added',
          key: `document:${doc.id}`,
          occurredAt: doc.createdAt.toISO()!,
          boatId: doc.boatId,
          boatName: doc.boat?.name ?? `#${doc.boatId}`,
          href: `/boats/${doc.boatId}?tab=documents`,
          documentType: doc.type,
          customTypeLabel: doc.customTypeLabel,
        })
      ),
    ]

    return items
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0))
      .slice(0, limit)
  }
}
