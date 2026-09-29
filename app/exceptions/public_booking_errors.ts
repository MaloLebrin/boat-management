/** Page publique de réservation (#881). */

/**
 * Organisation inconnue, sans le module réservations, ou bateau dont la page
 * n'est pas ouverte : 404, sans dire lequel des trois.
 */
export class PublicBookingNotFoundError extends Error {
  name = 'PublicBookingNotFoundError'
}

/**
 * Dates refusées pour une demande publique : `invalid` (format, départ avant
 * l'arrivée, hors de la fenêtre réservable) ou `unavailable` (chevauche un
 * jour occupé).
 */
export class PublicBookingDatesError extends Error {
  name = 'PublicBookingDatesError'

  constructor(readonly reason: 'invalid' | 'unavailable') {
    super(`public booking dates ${reason}`)
  }
}
