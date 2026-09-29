import type PublicBookingRequested from '#events/public_booking_requested'
import BoatReservation from '#models/boat_reservation'
import OrganizationMembership from '#models/organization_membership'
import User from '#models/user'
import EmailQueueService from '#services/email_queue_service'
import NotificationService from '#services/notification_service'
import { BrandingService } from '#services/branding_service'
import { toPublicBookingEmail } from '#transformers/public_booking_transformer'
import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'
import { toAppLocale } from '#shared/helpers/locale_path'

/**
 * Demande reçue sur la page publique de réservation (#881) : les admins de
 * l'organisation sont prévenus (in-app, push, e-mail dans leur langue) et le
 * client reçoit un accusé de réception aux couleurs du loueur.
 */
@inject()
export default class OnPublicBookingRequested {
  constructor(
    private notificationService: NotificationService,
    private emailQueueService: EmailQueueService,
    private brandingService: BrandingService
  ) {}

  async handle(event: PublicBookingRequested) {
    const reservation = await BoatReservation.query()
      .where('id', event.reservationId)
      .preload('boat', (q) =>
        q.select(['id', 'name']).preload('pricing', (p) => p.select(['id', 'boatId', 'currency']))
      )
      .preload('organization')
      .first()
    if (!reservation) return

    const org = reservation.organization
    const boatName = reservation.boat.name
    const actionPath = `/boats/${reservation.boatId}/reservations`

    const memberships = await OrganizationMembership.query()
      .where('organizationId', org.id)
      .where('role', 'admin')
      .select(['userId'])
    const adminIds = memberships.map((m) => m.userId)
    const admins = adminIds.length
      ? await User.query().whereIn('id', adminIds).select(['id', 'email', 'locale'])
      : []

    for (const admin of admins) {
      const i18n = i18nManager.locale(toAppLocale(admin.locale, 'fr'))
      const vars = { boatName, clientName: reservation.clientName }
      await this.notificationService.create({
        userId: admin.id,
        organizationId: org.id,
        type: 'reservation.requested',
        severity: 'info',
        title: i18n.t('notifications.messages.reservation.requested.title', vars),
        body: i18n.t('notifications.messages.reservation.requested.body', vars),
        actionUrl: actionPath,
        metadata: { reservationId: reservation.id, boatId: reservation.boatId },
      })
      await this.emailQueueService.sendPublicBookingEmail(
        toPublicBookingEmail(reservation, org, {
          kind: 'alert',
          to: admin.email,
          locale: admin.locale ?? 'fr',
          actionPath,
          branding: null,
        })
      )
    }

    if (reservation.clientEmail) {
      await this.emailQueueService.sendPublicBookingEmail(
        toPublicBookingEmail(reservation, org, {
          kind: 'ack',
          to: reservation.clientEmail,
          locale: reservation.requestLocale ?? 'fr',
          actionPath,
          branding: this.brandingService.toEmailParams(org),
        })
      )
    }
  }
}
