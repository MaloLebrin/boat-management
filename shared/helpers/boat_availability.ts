import {
  DEFAULT_TASK_UNAVAILABILITY_DAYS,
  IMMOBILIZING_BOAT_STATUSES,
  type BoatStatus,
  type BoatUnavailabilityWindow,
} from '#shared/types/boat_status'

const DAY_MS = 86_400_000

export interface AvailabilityTaskInput {
  id: number
  title: string
  /** Échéance civile `YYYY-MM-DD`. */
  dueAt: string
  estimatedDurationMinutes: number | null
}

export interface AvailabilityIncidentInput {
  id: number
  type: string
  /** Instant ISO de survenue. */
  occurredAt: string
}

export interface AvailabilityInputs {
  status: BoatStatus
  statusChangedAt: string | null
  /** Tâches **ouvertes** datées. */
  tasks: AvailabilityTaskInput[]
  /** Incidents **non clos** de type immobilisant. */
  incidents: AvailabilityIncidentInput[]
}

/** Jours d'immobilisation d'une tâche : sa durée prévue arrondie au jour, au moins un. */
export function taskUnavailabilityDays(estimatedDurationMinutes: number | null): number {
  if (!estimatedDurationMinutes || estimatedDurationMinutes <= 0) {
    return DEFAULT_TASK_UNAVAILABILITY_DAYS
  }
  return Math.max(1, Math.ceil(estimatedDurationMinutes / (24 * 60)))
}

/**
 * Agrège statut, tâches datées et incidents ouverts en fenêtres
 * d'indisponibilité (#870), triées par début (les fenêtres ouvertes à gauche
 * en tête).
 *
 * - statut immobilisant → fenêtre ouverte depuis `statusChangedAt` ;
 * - tâche ouverte datée → de son échéance (minuit UTC) sur sa durée prévue,
 *   un jour par défaut ;
 * - incident immobilisant non clos → ouverte depuis sa survenue.
 */
export function buildUnavailabilityWindows(input: AvailabilityInputs): BoatUnavailabilityWindow[] {
  const windows: BoatUnavailabilityWindow[] = []

  if (IMMOBILIZING_BOAT_STATUSES.includes(input.status)) {
    windows.push({
      source: 'status',
      startsAt: input.statusChangedAt,
      endsAt: null,
      label: input.status,
      refId: null,
    })
  }

  for (const task of input.tasks) {
    const start = Date.parse(`${task.dueAt.slice(0, 10)}T00:00:00.000Z`)
    if (Number.isNaN(start)) continue
    const end = start + taskUnavailabilityDays(task.estimatedDurationMinutes) * DAY_MS
    windows.push({
      source: 'task',
      startsAt: new Date(start).toISOString(),
      endsAt: new Date(end).toISOString(),
      label: task.title,
      refId: task.id,
    })
  }

  for (const incident of input.incidents) {
    windows.push({
      source: 'incident',
      startsAt: incident.occurredAt,
      endsAt: null,
      label: incident.type,
      refId: incident.id,
    })
  }

  return windows.sort((a, b) => toMs(a.startsAt, -Infinity) - toMs(b.startsAt, -Infinity))
}

/** La fenêtre chevauche-t-elle `[startsAt, endsAt[` ? Bornes ouvertes = infinies. */
export function windowOverlaps(
  window: BoatUnavailabilityWindow,
  startsAt: string,
  endsAt: string
): boolean {
  const windowStart = toMs(window.startsAt, -Infinity)
  const windowEnd = toMs(window.endsAt, Infinity)
  return windowStart < Date.parse(endsAt) && windowEnd > Date.parse(startsAt)
}

function toMs(iso: string | null, fallback: number): number {
  if (iso === null) return fallback
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? fallback : ms
}
