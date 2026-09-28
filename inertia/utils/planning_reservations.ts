import type { PlanningReservation } from '#shared/types/planning'

type Translate = (key: string, params?: Record<string, string>) => string

/** Infobulle d'une bande de réservation du planning (#869). */
export function reservationBandTitle(
  t: Translate,
  formatDayMonth: (value: string) => string,
  reservation: PlanningReservation
): string {
  return t(`planning.reservations.band.${reservation.status}`, {
    boat: reservation.boatName,
    client: reservation.clientName,
    from: formatDayMonth(reservation.startsAt),
    to: formatDayMonth(reservation.endsAt),
  })
}

export function reservationBandKind(
  reservation: PlanningReservation
): 'reservation-confirmed' | 'reservation-option' {
  return reservation.status === 'confirmed' ? 'reservation-confirmed' : 'reservation-option'
}
