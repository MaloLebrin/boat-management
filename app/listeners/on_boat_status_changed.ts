import type BoatStatusChanged from '#events/boat_status_changed'
import Boat from '#models/boat'
import OrganizationMembership from '#models/organization_membership'
import NotificationService from '#services/notification_service'
import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'

@inject()
export default class OnBoatStatusChanged {
  constructor(private notificationService: NotificationService) {}

  async handle(event: BoatStatusChanged) {
    const locale = i18nManager.locale(i18nManager.defaultLocale)
    const statusLabel = (status: string) =>
      locale.formatMessage(`notifications.messages.boat.statuses.${status}`)

    // Sortie d'immobilisation : un message dédié, c'est celui qu'on attend.
    const availableAgain = event.toStatus === 'available' && event.fromStatus !== 'sold'
    const type = availableAgain ? 'boat.available_again' : 'boat.status_changed'
    const params = {
      boatName: event.boat.name,
      fromStatus: statusLabel(event.fromStatus),
      toStatus: statusLabel(event.toStatus),
      changedBy: event.changedBy.name,
    }
    const messageKey = availableAgain ? 'available_again' : 'status_changed'
    const title = locale.formatMessage(`notifications.messages.boat.${messageKey}.title`, params)
    const body = event.reason
      ? locale.formatMessage(`notifications.messages.boat.${messageKey}.bodyWithReason`, {
          ...params,
          reason: event.reason,
        })
      : locale.formatMessage(`notifications.messages.boat.${messageKey}.body`, params)

    const [adminMemberships, boat] = await Promise.all([
      OrganizationMembership.query()
        .where('organizationId', event.organizationId)
        .where('role', 'admin')
        .select(['userId']),
      Boat.query()
        .where('id', event.boat.id)
        .preload('owners', (q) => q.select(['id']))
        .first(),
    ])

    // Le propriétaire n'a pas accès à la fiche staff : il suit son bateau
    // depuis le portail. Un admin également propriétaire garde le lien staff.
    const recipients = new Map<number, string>()
    for (const owner of boat?.owners ?? []) {
      recipients.set(owner.id, `/owner/boats/${event.boat.id}`)
    }
    for (const membership of adminMemberships) {
      recipients.set(membership.userId, `/boats/${event.boat.id}`)
    }
    recipients.delete(event.changedBy.id)

    await Promise.all(
      [...recipients].map(([userId, actionUrl]) =>
        this.notificationService.create({
          userId,
          organizationId: event.organizationId,
          type,
          severity: availableAgain ? 'success' : 'warning',
          title,
          body,
          actionUrl,
          metadata: {
            boatId: event.boat.id,
            fromStatus: event.fromStatus,
            toStatus: event.toStatus,
          },
        })
      )
    )
  }
}
