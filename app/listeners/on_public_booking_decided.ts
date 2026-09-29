import type PublicBookingDecided from '#events/public_booking_decided'
import BoatReservation from '#models/boat_reservation'
import EmailQueueService from '#services/email_queue_service'
import { BrandingService } from '#services/branding_service'
import { toPublicBookingEmail } from '#transformers/public_booking_transformer'
import { inject } from '@adonisjs/core'

/**
 * Demande en ligne confirmée ou refusée par le loueur (#881) : le client, qui
 * n'a pas de compte, l'apprend par e-mail, aux couleurs du loueur.
 */
@inject()
export default class OnPublicBookingDecided {
  constructor(
    private emailQueueService: EmailQueueService,
    private brandingService: BrandingService
  ) {}

  async handle(event: PublicBookingDecided) {
    const reservation = await BoatReservation.query()
      .where('id', event.reservationId)
      .preload('boat', (q) =>
        q.select(['id', 'name']).preload('pricing', (p) => p.select(['id', 'boatId', 'currency']))
      )
      .preload('organization')
      .first()
    if (!reservation?.clientEmail) return

    await this.emailQueueService.sendPublicBookingEmail(
      toPublicBookingEmail(reservation, reservation.organization, {
        kind: event.decision === 'confirmed' ? 'confirmed' : 'declined',
        to: reservation.clientEmail,
        locale: reservation.requestLocale ?? 'fr',
        actionPath: `/boats/${reservation.boatId}/reservations`,
        branding: this.brandingService.toEmailParams(reservation.organization),
      })
    )
  }
}
