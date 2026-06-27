import type BoatReservation from '#models/boat_reservation'
import type { BoatReservationRow } from '#shared/types/reservation'

export function toBoatReservationRow(
  reservation: BoatReservation,
  boatName: string
): BoatReservationRow {
  return {
    id: reservation.id,
    boatId: reservation.boatId,
    boatName,
    organizationId: reservation.organizationId,
    status: reservation.status,
    startsAt: reservation.startsAt.toISO()!,
    endsAt: reservation.endsAt.toISO()!,
    clientName: reservation.clientName,
    clientEmail: reservation.clientEmail,
    clientPhone: reservation.clientPhone,
    notes: reservation.notes,
    totalPrice: reservation.totalPrice,
    createdAt: reservation.createdAt.toISO()!,
  }
}
