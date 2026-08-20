import type BoatReservation from '#models/boat_reservation'
import type {
  BoatReservationRow,
  FleetBoatCalendarEntry,
  FleetBoatOption,
} from '#shared/types/reservation'
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

/**
 * Une ligne de calendrier par bateau de la flotte — y compris les bateaux sans
 * aucune réservation, pour qu'on lise les disponibilités de toute la flotte d'un
 * coup d'œil (#477).
 */
export function toFleetCalendarEntries(
  boats: FleetBoatOption[],
  rows: BoatReservationRow[]
): FleetBoatCalendarEntry[] {
  const entries = new Map<number, FleetBoatCalendarEntry>(
    boats.map((boat) => [boat.id, { boatId: boat.id, boatName: boat.name, reservations: [] }])
  )

  for (const row of rows) {
    const entry = entries.get(row.boatId)
    if (entry) entry.reservations.push(row)
  }

  return Array.from(entries.values())
}
