import type ReservationChanged from '#events/reservation_changed'
import NotificationAudienceService from '#services/notification_audience_service'
import NotificationService from '#services/notification_service'
import { formatDateLong } from '#shared/helpers/date_format'
import { toAppLocale } from '#shared/helpers/locale_path'
import type { NotificationSeverity } from '#shared/types/notification'
import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'

const SEVERITY: Record<ReservationChanged['change'], NotificationSeverity> = {
  created: 'info',
  confirmed: 'success',
  cancelled: 'warning',
}

/** Réservation créée, confirmée ou annulée par l'équipe (#888). */
@inject()
export default class OnReservationChanged {
  constructor(
    private notificationService: NotificationService,
    private audience: NotificationAudienceService
  ) {}

  async handle(event: ReservationChanged) {
    const { reservation, change } = event
    const members = await this.audience.staffOf(event.organizationId, event.actor.id)
    const type = `reservation.${change}` as const

    await Promise.all(
      members.map((member) => {
        // Rédigée dans la langue du destinataire (#414).
        const locale = i18nManager.locale(toAppLocale(member.locale))
        const params = {
          boatName: reservation.boatName,
          clientName: reservation.clientName,
          date: formatDateLong(reservation.startsAt, locale.locale),
          actorName: event.actor.name,
        }
        return this.notificationService.create({
          userId: member.userId,
          organizationId: event.organizationId,
          type,
          severity: SEVERITY[change],
          title: locale.formatMessage(`notifications.messages.${type}.title`, params),
          body: locale.formatMessage(`notifications.messages.${type}.body`, params),
          actionUrl: `/boats/${reservation.boatId}/reservations`,
          metadata: { reservationId: reservation.id, boatId: reservation.boatId },
        })
      })
    )
  }
}
