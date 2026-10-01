import type { CrewPlanningEntry } from '#shared/types/crew'
import { toDateInputValue } from '~/utils/local_datetime'

/**
 * Jours du calendrier d'équipage (#883), `YYYY-MM-DD`, du `from` au `to`
 * inclus. Calcul en UTC sur des dates pures : aucun fuseau ne décale un jour.
 */
export function planningDays(from: string, to: string): string[] {
  const days: string[] = []
  const cursor = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

/**
 * Premier et dernier jour couverts par une case. Une réservation porte des
 * instants, lus dans le fuseau du navigateur (fin exclue : un retour à minuit
 * ne déborde pas sur le jour suivant) ; une indisponibilité, des jours inclus.
 */
export function entryDays(entry: CrewPlanningEntry): { first: string; last: string } {
  if (entry.kind === 'unavailability') return { first: entry.startsAt, last: entry.endsAt }
  const start = new Date(entry.startsAt)
  const end = new Date(new Date(entry.endsAt).getTime() - 1)
  return { first: toDateInputValue(start), last: toDateInputValue(end) }
}

/** Cases d'un équipier qui occupent le jour donné. */
export function entriesOnDay(entries: CrewPlanningEntry[], day: string): CrewPlanningEntry[] {
  return entries.filter((entry) => {
    const { first, last } = entryDays(entry)
    return first <= day && day <= last
  })
}

/** Lundi de la semaine précédente / suivante du calendrier, `YYYY-MM-DD`. */
export function shiftDays(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + delta)
  return date.toISOString().slice(0, 10)
}
