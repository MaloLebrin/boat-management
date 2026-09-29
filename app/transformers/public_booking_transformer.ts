import type BoatReservation from '#models/boat_reservation'
import type Organization from '#models/organization'
import { decimalColumnToNumber } from '#shared/helpers/number_format'
import { PUBLIC_BOOKING_TIMEZONE } from '#shared/constants/public_booking'
import type { PublicBookingEmailKind, PublicBookingEmailParams } from '#shared/types/public_booking'
import type { BrandingEmailParams } from '#shared/types/branding'

/**
 * Paramètres d'un e-mail de demande publique (#881). Les dates redeviennent
 * les jours choisis sur la page — arrivée et départ à l'heure de Paris.
 * `reservation.boat` et son `pricing` doivent être préchargés.
 */
export function toPublicBookingEmail(
  reservation: BoatReservation,
  org: Organization,
  options: {
    kind: PublicBookingEmailKind
    to: string
    locale: string
    actionPath: string
    branding: BrandingEmailParams | null
  }
): PublicBookingEmailParams {
  return {
    ...options,
    reservationId: reservation.id,
    orgName: options.branding?.appName ?? org.name,
    boatName: reservation.boat.name,
    startsOn: reservation.startsAt.setZone(PUBLIC_BOOKING_TIMEZONE).toISODate()!,
    endsOn: reservation.endsAt.setZone(PUBLIC_BOOKING_TIMEZONE).toISODate()!,
    total: decimalColumnToNumber(reservation.totalPrice),
    // Le prix a été calculé dans la devise du tarif du bateau.
    currency: reservation.boat.pricing?.currency ?? 'EUR',
    clientName: reservation.clientName,
    clientEmail: reservation.clientEmail ?? '',
    clientPhone: reservation.clientPhone,
    message: reservation.notes,
  }
}
