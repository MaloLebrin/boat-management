import { BaseEvent } from '@adonisjs/core/events'

/**
 * Émis quand un client final envoie une demande depuis la page publique de
 * réservation (#881). Le listener prévient les admins de l'organisation
 * (in-app, push, e-mail) et accuse réception au client.
 */
export default class PublicBookingRequested extends BaseEvent {
  constructor(public readonly reservationId: number) {
    super()
  }
}
