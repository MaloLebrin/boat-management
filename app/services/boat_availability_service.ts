import type Boat from '#models/boat'
import BoatIncident from '#models/boat_incident'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import { buildUnavailabilityWindows, windowOverlaps } from '#shared/helpers/boat_availability'
import {
  IMMOBILIZING_INCIDENT_TYPES,
  type BoatAvailabilitySummary,
  type BoatUnavailabilityWindow,
} from '#shared/types/boat_status'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

/**
 * Une tâche plus ancienne que ça ne peut plus déborder sur aujourd'hui : même
 * une durée prévue de plusieurs semaines tient dans cette marge.
 */
const TASK_LOOKBACK_DAYS = 60

/** Horizon des fenêtres affichées sur la fiche et la page réservations. */
const SUMMARY_HORIZON_DAYS = 90

/**
 * Indisponibilités calculées d'un bateau (#870) : statut + tâches datées +
 * incidents immobilisants ouverts. Consommé par la règle de réservation
 * (`BoatReservationService`), la fiche bateau et la page réservations.
 */
export default class BoatAvailabilityService {
  async windowsForBoat(
    boat: Boat,
    options: { client?: TransactionClientContract; from?: DateTime } = {}
  ): Promise<BoatUnavailabilityWindow[]> {
    const from = options.from ?? DateTime.now()
    const client = options.client

    const [tasks, incidents] = await Promise.all([
      BoatMaintenanceTask.query({ client })
        .where('boatId', boat.id)
        .where('status', 'open')
        .whereNotNull('dueAt')
        .where('dueAt', '>=', from.minus({ days: TASK_LOOKBACK_DAYS }).toISODate()!)
        .select(['id', 'title', 'dueAt', 'estimatedDurationMinutes']),
      BoatIncident.query({ client })
        .where('boatId', boat.id)
        .whereNot('status', 'closed')
        .whereIn('type', [...IMMOBILIZING_INCIDENT_TYPES])
        .select(['id', 'type', 'occurredAt']),
    ])

    const windows = buildUnavailabilityWindows({
      status: boat.status,
      statusChangedAt: boat.statusChangedAt?.toISO() ?? null,
      tasks: tasks
        .filter((task) => task.dueAt !== null)
        .map((task) => ({
          id: task.id,
          title: task.title,
          dueAt: task.dueAt!.toISODate()!,
          estimatedDurationMinutes: task.estimatedDurationMinutes,
        })),
      incidents: incidents.map((incident) => ({
        id: incident.id,
        type: incident.type,
        occurredAt: incident.occurredAt.toISO()!,
      })),
    })

    // Une fenêtre déjà refermée n'a plus rien à dire.
    const fromMs = from.toMillis()
    return windows.filter((w) => w.endsAt === null || Date.parse(w.endsAt) > fromMs)
  }

  /** Fenêtres qui chevauchent `[startsAt, endsAt[`. */
  async conflictsFor(
    boat: Boat,
    startsAt: DateTime,
    endsAt: DateTime,
    client?: TransactionClientContract
  ): Promise<BoatUnavailabilityWindow[]> {
    const windows = await this.windowsForBoat(boat, { client, from: startsAt })
    return windows.filter((w) => windowOverlaps(w, startsAt.toISO()!, endsAt.toISO()!))
  }

  async summaryForBoat(boat: Boat): Promise<BoatAvailabilitySummary> {
    const horizon = DateTime.now().plus({ days: SUMMARY_HORIZON_DAYS }).toMillis()
    const windows = await this.windowsForBoat(boat)
    return {
      status: boat.status,
      statusReason: boat.statusReason,
      statusChangedAt: boat.statusChangedAt?.toISO() ?? null,
      windows: windows.filter((w) => w.startsAt === null || Date.parse(w.startsAt) < horizon),
    }
  }
}
