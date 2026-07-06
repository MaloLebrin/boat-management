import type BoatReservation from '#models/boat_reservation'
import type { BoatReservationRow } from '#shared/types/reservation'
import type { InvoiceLink } from '#shared/types/invoice'

export function toBoatReservationRow(
  reservation: BoatReservation,
  boatName: string,
  linkedInvoices: InvoiceLink[] = []
): BoatReservationRow {
  return {
    id: reservation.id,
    boatId: reservation.boatId,
    boatName,
    organizationId: reservation.organizationId,
    clientId: reservation.clientId,
    status: reservation.status,
    startsAt: reservation.startsAt.toISO()!,
    endsAt: reservation.endsAt.toISO()!,
    clientName: reservation.clientName,
    clientEmail: reservation.clientEmail,
    clientPhone: reservation.clientPhone,
    notes: reservation.notes,
    totalPrice: reservation.totalPrice,
    createdAt: reservation.createdAt.toISO()!,
    linkedInvoices,
  }
}
