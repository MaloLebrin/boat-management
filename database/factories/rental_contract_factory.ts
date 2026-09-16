import RentalContract from '#models/rental_contract'
import Factory from '@adonisjs/lucid/factories'
import { DateTime } from 'luxon'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { ClientFactory } from '#database/factories/client_factory'

/**
 * Contrat en brouillon ; état `signed` pour un contrat signé (sans média —
 * fournir `mediaId` via `merge()` pour simuler le document signé).
 */
export const RentalContractFactory = Factory.define(RentalContract, () => ({
  clientId: null,
  mediaId: null,
  status: 'draft' as const,
  signedAt: null,
}))
  .state('signed', (contract) => {
    contract.status = 'signed'
    contract.signedAt = DateTime.now()
  })
  .relation('reservation', () => BoatReservationFactory)
  .relation('client', () => ClientFactory)
  .build()
