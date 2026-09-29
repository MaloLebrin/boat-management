import { BaseEvent } from '@adonisjs/core/events'

/**
 * Émis quand le loueur tranche une demande en ligne (#881) : confirmée, ou
 * annulée (refus explicite, ou option écartée par une confirmation sur le
 * même créneau). Le listener l'annonce au client par e-mail.
 */
export default class PublicBookingDecided extends BaseEvent {
  constructor(
    public readonly reservationId: number,
    public readonly decision: 'confirmed' | 'cancelled'
  ) {
    super()
  }
}
