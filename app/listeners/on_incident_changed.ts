import type IncidentChanged from '#events/incident_changed'
import NotificationAudienceService from '#services/notification_audience_service'
import NotificationService from '#services/notification_service'
import { toAppLocale } from '#shared/helpers/locale_path'
import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'

/** Incident déclaré ou clôturé (#888) : toute l'équipe, sauf l'auteur. */
@inject()
export default class OnIncidentChanged {
  constructor(
    private notificationService: NotificationService,
    private audience: NotificationAudienceService
  ) {}

  async handle(event: IncidentChanged) {
    const { incident, change } = event
    const members = await this.audience.staffOf(event.organizationId, event.actor.id)
    const type = `incident.${change}` as const

    await Promise.all(
      members.map((member) => {
        const locale = i18nManager.locale(toAppLocale(member.locale))
        const params = {
          boatName: incident.boatName,
          incidentType: locale.formatMessage(`incidents.type.${incident.type}`),
          actorName: event.actor.name,
        }
        return this.notificationService.create({
          userId: member.userId,
          organizationId: event.organizationId,
          type,
          severity: change === 'created' ? 'error' : 'success',
          title: locale.formatMessage(`notifications.messages.${type}.title`, params),
          body: locale.formatMessage(`notifications.messages.${type}.body`, params),
          actionUrl: `/boats/${incident.boatId}/incidents/${incident.id}`,
          metadata: { incidentId: incident.id, boatId: incident.boatId },
        })
      })
    )
  }
}
