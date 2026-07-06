import type RentalContract from '#models/rental_contract'
import type Boat from '#models/boat'
import type { RentalContractRow } from '#shared/types/rental_contract'

export function toRentalContractRow(contract: RentalContract, boat: Boat): RentalContractRow {
  const reservation = contract.reservation

  return {
    id: contract.id,
    reservationId: contract.reservationId,
    clientId: contract.clientId,
    status: contract.status,
    signedAt: contract.signedAt?.toISO() ?? null,
    createdAt: contract.createdAt.toISO()!,
    boatId: boat.id,
    boatName: boat.name,
    clientName: contract.client?.fullName ?? reservation.clientName,
    clientEmail: contract.client?.email ?? reservation.clientEmail,
    reservationStart: reservation.startsAt.toISO()!,
    reservationEnd: reservation.endsAt.toISO()!,
    mediaSecureUrl: contract.media?.secureUrl ?? null,
    mediaFilename: contract.media?.originalFilename ?? null,
  }
}
