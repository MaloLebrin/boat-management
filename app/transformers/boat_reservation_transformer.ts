import type BoatReservation from '#models/boat_reservation'
import type {
  BoatReservationRow,
  FleetBoatCalendarEntry,
  FleetMaintenanceWindow,
  FleetBoatOption,
} from '#shared/types/reservation'
import type { InvoiceLink } from '#shared/types/invoice'
import type { ExternalBlockRow } from '#shared/types/calendar_sync'

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
    type: reservation.type,
    startsAt: reservation.startsAt.toISO()!,
    endsAt: reservation.endsAt.toISO()!,
    clientName: reservation.clientName,
    clientEmail: reservation.clientEmail,
    clientPhone: reservation.clientPhone,
    notes: reservation.notes,
    totalPrice: reservation.totalPrice,
    depositAmount: reservation.depositAmount ?? null,
    depositPaidAt: reservation.depositPaidAt?.toISO() ?? null,
    balancePaidAt: reservation.balancePaidAt?.toISO() ?? null,
    // Une ligne créée sans relecture (`create`) n'a pas les défauts SQL.
    paidAmount: reservation.paidAmount ?? '0.00',
    paymentStatus: reservation.paymentStatus ?? 'unpaid',
    paymentMethod: reservation.paymentMethod ?? null,
    securityDepositAmount: reservation.securityDepositAmount ?? null,
    securityDepositStatus: reservation.securityDepositStatus ?? 'none',
    securityDepositRetainedAmount: reservation.securityDepositRetainedAmount ?? null,
    securityDepositNote: reservation.securityDepositNote ?? null,
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
  rows: BoatReservationRow[],
  maintenanceByBoat: Map<number, FleetMaintenanceWindow[]> = new Map(),
  externalBlocks: ExternalBlockRow[] = []
): FleetBoatCalendarEntry[] {
  const entries = new Map<number, FleetBoatCalendarEntry>(
    boats.map((boat) => [
      boat.id,
      {
        boatId: boat.id,
        boatName: boat.name,
        reservations: [],
        maintenance: maintenanceByBoat.get(boat.id) ?? [],
        external: [],
      },
    ])
  )

  for (const row of rows) {
    const entry = entries.get(row.boatId)
    if (entry) entry.reservations.push(row)
  }
  for (const block of externalBlocks) {
    entries.get(block.boatId)?.external.push(block)
  }

  return Array.from(entries.values())
}
