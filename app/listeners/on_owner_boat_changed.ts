import type OwnerBoatChanged from '#events/owner_boat_changed'
import NotificationAudienceService from '#services/notification_audience_service'
import NotificationService from '#services/notification_service'
import { toAppLocale } from '#shared/helpers/locale_path'
import type { NotificationSeverity } from '#shared/types/notification'
import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'

const SEVERITY: Record<OwnerBoatChanged['change'], NotificationSeverity> = {
  maintenance_done: 'success',
  incident_created: 'error',
  approval_requested: 'warning',
}

/** Vie d'un bateau confié (#890) : ses propriétaires, sauf l'auteur. */
@inject()
export default class OnOwnerBoatChanged {
  constructor(
    private notificationService: NotificationService,
    private audience: NotificationAudienceService
  ) {}

  async handle(event: OwnerBoatChanged) {
    const owners = await this.audience.ownersOfBoat(event.organizationId, event.boat.id)
    const type = `owner.${event.change}` as const

    await Promise.all(
      owners
        .filter((owner) => owner.userId !== event.actorId)
        .map((owner) => {
          const locale = i18nManager.locale(toAppLocale(owner.locale))
          const label = event.subject.labelKey
            ? locale.formatMessage(event.subject.labelKey)
            : event.subject.label
          const params = { boatName: event.boat.name, label }
          return this.notificationService.create({
            userId: owner.userId,
            organizationId: event.organizationId,
            type,
            severity: SEVERITY[event.change],
            title: locale.formatMessage(`notifications.messages.${type}.title`, params),
            body: locale.formatMessage(`notifications.messages.${type}.body`, params),
            actionUrl: `/owner/boats/${event.boat.id}`,
            metadata: { boatId: event.boat.id, subjectId: event.subject.id },
          })
        })
    )
  }
}
