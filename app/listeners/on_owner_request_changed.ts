import type OwnerRequestChanged from '#events/owner_request_changed'
import NotificationAudienceService from '#services/notification_audience_service'
import NotificationService from '#services/notification_service'
import { toAppLocale } from '#shared/helpers/locale_path'
import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'

/** Demande ou accord d'un propriétaire (#890) : toute l'équipe. */
@inject()
export default class OnOwnerRequestChanged {
  constructor(
    private notificationService: NotificationService,
    private audience: NotificationAudienceService
  ) {}

  async handle(event: OwnerRequestChanged) {
    const members = await this.audience.staffOf(event.organizationId, null)
    const type = `owner.${event.change}` as const

    await Promise.all(
      members.map((member) => {
        const locale = i18nManager.locale(toAppLocale(member.locale))
        const params = {
          boatName: event.boat.name,
          title: event.task.title,
          ownerName: event.owner.name,
          decision: event.decision ?? 'approved',
        }
        return this.notificationService.create({
          userId: member.userId,
          organizationId: event.organizationId,
          type,
          severity: event.decision === 'rejected' ? 'warning' : 'info',
          title: locale.formatMessage(`notifications.messages.${type}.title`, params),
          body: locale.formatMessage(`notifications.messages.${type}.body`, params),
          actionUrl: `/planning?task=${event.task.id}`,
          metadata: { boatId: event.boat.id, taskId: event.task.id },
        })
      })
    )
  }
}
