import { BaseEvent } from '@adonisjs/core/events'

export type ReservationChange = 'created' | 'confirmed' | 'cancelled'

/**
 * Émis quand l'équipe crée, confirme ou annule une réservation (#888). Le
 * listener prévient l'équipe de l'organisation — sauf l'auteur —, chacun
 * filtré par ses préférences (le mécanicien n'a rien de la location par
 * défaut). Une demande en ligne a son propre événement (`PublicBookingRequested`).
 */
export default class ReservationChanged extends BaseEvent {
  constructor(
    public readonly organizationId: number,
    public readonly reservation: {
      id: number
      boatId: number
      boatName: string
      clientName: string
      startsAt: string
    },
    public readonly change: ReservationChange,
    public readonly actor: { id: number; name: string }
  ) {
    super()
  }
}
