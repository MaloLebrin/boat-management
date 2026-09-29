/**
 * Page publique de réservation (#881).
 */

/** Fuseau des dates choisies sur la page : une arrivée le 12 juillet est le 12 à Paris. */
export const PUBLIC_BOOKING_TIMEZONE = 'Europe/Paris'

/**
 * Horizon du calendrier public, en mois. Au-delà, la page n'affiche plus rien
 * et refuse la demande : un loueur ne publie pas encore ses tarifs si loin.
 */
export const PUBLIC_BOOKING_HORIZON_MONTHS = 12

/**
 * Délai minimal avant l'arrivée, en jours. Une demande pour aujourd'hui
 * arrive trop tard pour être traitée : le client doit appeler.
 */
export const PUBLIC_BOOKING_LEAD_DAYS = 1

/** Rétention des demandes jamais confirmées : définie avec les autres durées (#775). */
export { PUBLIC_BOOKING_REQUEST_RETENTION_DAYS } from './data_retention.js'

/** Longueurs maximales du formulaire de demande. */
export const PUBLIC_BOOKING_NAME_MAX = 120
export const PUBLIC_BOOKING_MESSAGE_MAX = 2000

/** Nom du champ piège (honeypot) : invisible pour un humain, rempli par un robot. */
export const PUBLIC_BOOKING_HONEYPOT_FIELD = 'website'
