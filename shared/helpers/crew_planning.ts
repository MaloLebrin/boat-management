import type { NavigationLogCrewRole, ReservationCrewRole } from '#shared/types/crew'

/**
 * Deux créneaux `[début, fin[` se recoupent (#883). Bornes en millisecondes :
 * une réservation qui finit à 18 h ne bloque pas celle qui commence à 18 h.
 */
export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd
}

/**
 * Une indisponibilité (jours `YYYY-MM-DD` inclus) recoupe un créneau dont les
 * jours de début et de fin sont donnés au même format. La comparaison
 * lexicographique des dates ISO suffit — pas de fuseau à manipuler.
 */
export function dayRangeOverlaps(
  startsOn: string,
  endsOn: string,
  firstDay: string,
  lastDay: string
): boolean {
  return startsOn <= lastDay && endsOn >= firstDay
}

/**
 * Rôle dans le journal de bord d'un équipier affecté à la réservation : le
 * journal ne connaît pas `instructor`, qui y embarque comme équipier.
 */
export function navigationLogRoleFor(role: ReservationCrewRole): NavigationLogCrewRole {
  return role === 'skipper' ? 'skipper' : 'crew'
}
