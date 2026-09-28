/**
 * Report en un clic d'une tâche planifiée (#867). Les dates sont des valeurs
 * machine `YYYY-MM-DD` (celles d'un `<input type="date">`), calculées en
 * calendrier pur : pas de fuseau, pas d'heure.
 */

export const POSTPONE_PRESETS = ['week', 'month'] as const
export type PostponePreset = (typeof POSTPONE_PRESETS)[number]

function parse(value: string): { y: number; m: number; d: number } {
  const [y, m, d] = value.split('-').map(Number)
  return { y, m, d }
}

function format(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function addDays(value: string, days: number): string {
  const { y, m, d } = parse(value)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return format(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

/** Un mois plus tard, borné à la fin du mois : le 31 janvier donne le 28 (ou 29) février. */
function addOneMonth(value: string): string {
  const { y, m, d } = parse(value)
  const nextY = m === 12 ? y + 1 : y
  const nextM = m === 12 ? 1 : m + 1
  return format(nextY, nextM, Math.min(d, daysInMonth(nextY, nextM)))
}

/**
 * Nouvelle échéance pour un report rapide. Le report part de l'échéance
 * actuelle, ou d'aujourd'hui si elle est déjà dépassée : reporter d'une semaine
 * une tâche en retard d'un mois doit la placer dans une semaine, pas la laisser
 * en retard.
 */
export function postponedDueDate(dueAt: string, preset: PostponePreset, today: string): string {
  const base = dueAt < today ? today : dueAt
  return preset === 'week' ? addDays(base, 7) : addOneMonth(base)
}
