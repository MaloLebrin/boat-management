import { taskUnavailabilityDays } from '#shared/helpers/boat_availability'
import {
  PLANNING_SOON_DAYS,
  type PlanningDropColumn,
  type PlanningReservation,
} from '#shared/types/planning'

/**
 * Calculs du glisser-déposer du planning (#869). Les dates sont des valeurs
 * machine `YYYY-MM-DD`, en calendrier pur (pas de fuseau, pas d'heure) ; une
 * tâche occupe ses jours à partir de minuit UTC, comme les fenêtres
 * d'indisponibilité de #870.
 */

const DAY_MS = 86_400_000

function parse(value: string): { y: number; m: number; d: number } {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return { y, m, d }
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(value: string, days: number): string {
  const { y, m, d } = parse(value)
  return toIso(new Date(Date.UTC(y, m - 1, d + days)))
}

/** Un mois plus tard, borné à la fin du mois : le 31 janvier donne le 28 (ou 29) février. */
export function addOneMonth(value: string): string {
  const { y, m, d } = parse(value)
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return toIso(new Date(Date.UTC(y, m, Math.min(d, lastDay))))
}

/** Dimanche de la semaine (lundi → dimanche) de `value`. */
export function endOfWeek(value: string): string {
  const { y, m, d } = parse(value)
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return addDays(value, weekday === 0 ? 0 : 7 - weekday)
}

/**
 * Nouvelle échéance d'une carte déposée dans une colonne du kanban :
 *
 * - « Bientôt » → fin de la semaine en cours ;
 * - « Planifiées » → dans un mois, et au moins au-delà du seuil « bientôt »
 *   (un mois de février ne fait que 28 jours : la carte resterait sinon en
 *   « Bientôt ») ;
 * - « Non datées » → plus d'échéance.
 */
export function dueAtForColumn(column: PlanningDropColumn, today: string): string | null {
  if (column === 'undated') return null
  if (column === 'soon') return endOfWeek(today)
  const inAMonth = addOneMonth(today)
  const pastSoon = addDays(today, PLANNING_SOON_DAYS + 1)
  return inAMonth > pastSoon ? inAMonth : pastSoon
}

/** Colonne où le serveur rangera une tâche datée de `dueAt` (#869, rendu optimiste). */
export function columnForDueAt(
  dueAt: string | null,
  today: string
): PlanningDropColumn | 'overdue' {
  if (dueAt === null) return 'undated'
  if (dueAt < today) return 'overdue'
  return dueAt <= addDays(today, PLANNING_SOON_DAYS) ? 'soon' : 'planned'
}

export interface ScheduledTaskInput {
  boatId: number
  dueAt: string | null
  estimatedDurationMinutes: number | null
}

/**
 * Réservation **confirmée** du même bateau qui chevauche les jours occupés par
 * la tâche — une option ne bloque rien (#870). `null` si aucune.
 */
export function reservationConflictFor(
  task: ScheduledTaskInput,
  reservations: readonly PlanningReservation[]
): PlanningReservation | null {
  if (task.dueAt === null) return null
  const start = Date.parse(`${task.dueAt.slice(0, 10)}T00:00:00.000Z`)
  if (Number.isNaN(start)) return null
  const end = start + taskUnavailabilityDays(task.estimatedDurationMinutes) * DAY_MS
  return (
    reservations.find(
      (r) =>
        r.status === 'confirmed' &&
        r.boatId === task.boatId &&
        Date.parse(r.startsAt) < end &&
        Date.parse(r.endsAt) > start
    ) ?? null
  )
}

/** La réservation couvre-t-elle (au moins en partie) le jour `iso` ? */
export function reservationCoversDay(reservation: PlanningReservation, iso: string): boolean {
  const start = Date.parse(`${iso}T00:00:00.000Z`)
  return Date.parse(reservation.startsAt) < start + DAY_MS && Date.parse(reservation.endsAt) > start
}

/** Jours `[startsOn, endsOn[` occupés par une tâche datée. */
export function taskOccupiedDays(
  dueAt: string,
  estimatedDurationMinutes: number | null
): { startsOn: string; endsOn: string } {
  const startsOn = dueAt.slice(0, 10)
  return { startsOn, endsOn: addDays(startsOn, taskUnavailabilityDays(estimatedDurationMinutes)) }
}
