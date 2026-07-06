import {
  RentalContractAlreadyExistsError,
  RentalContractInvalidTransitionError,
  RentalContractNotFoundError,
} from '#exceptions/rental_contract_errors'
import RentalContract from '#models/rental_contract'
import Client from '#models/client'
import type BoatReservation from '#models/boat_reservation'
import type User from '#models/user'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

function assertReservationScope(user: User, reservation: BoatReservation) {
  if (user.organizationId === null || user.organizationId !== reservation.organizationId) {
    throw new RentalContractNotFoundError()
  }
}

/**
 * Detects the PostgreSQL unique-violation (23505) raised by the
 * reservation_id unique index, so a concurrent duplicate create surfaces as
 * a business error instead of a raw 500.
 */
function isReservationConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const err = error as { code?: unknown }
  return err.code === '23505'
}

@inject()
export default class RentalContractService {
  async findForReservation(
    user: User,
    reservation: BoatReservation
  ): Promise<RentalContract | null> {
    assertReservationScope(user, reservation)

    return await RentalContract.query()
      .where('reservationId', reservation.id)
      .preload('reservation', (q) => q.preload('boat'))
      .preload('client')
      .first()
  }

  /**
   * Resolves the CRM client linked to the contract: prefer the reservation's
   * linked client FK (#275), fall back to matching the snapshot email (#288),
   * same resolution order as InvoiceService#createQuoteFromReservation.
   */
  async createForReservation(user: User, reservation: BoatReservation): Promise<RentalContract> {
    assertReservationScope(user, reservation)

    let clientId: number | null = null
    if (reservation.clientId) {
      const client = await Client.query()
        .where('id', reservation.clientId)
        .where('organizationId', reservation.organizationId)
        .first()
      clientId = client?.id ?? null
    }
    if (!clientId && reservation.clientEmail) {
      const client = await Client.query()
        .where('organizationId', reservation.organizationId)
        .where('email', reservation.clientEmail)
        .first()
      clientId = client?.id ?? null
    }

    try {
      return await RentalContract.create({
        reservationId: reservation.id,
        organizationId: reservation.organizationId,
        clientId,
        status: 'draft',
      })
    } catch (error) {
      if (isReservationConflict(error)) {
        throw new RentalContractAlreadyExistsError()
      }
      throw error
    }
  }

  async markSent(contract: RentalContract): Promise<RentalContract> {
    if (contract.status !== 'draft') {
      throw new RentalContractInvalidTransitionError()
    }
    contract.status = 'sent'
    await contract.save()
    return contract
  }

  async markSigned(contract: RentalContract): Promise<RentalContract> {
    if (contract.status !== 'sent') {
      throw new RentalContractInvalidTransitionError()
    }
    contract.status = 'signed'
    contract.signedAt = DateTime.now()
    await contract.save()
    return contract
  }

  async deleteForReservation(user: User, reservation: BoatReservation): Promise<void> {
    assertReservationScope(user, reservation)

    const contract = await RentalContract.query().where('reservationId', reservation.id).first()
    if (!contract) throw new RentalContractNotFoundError()

    await contract.delete()
  }
}
