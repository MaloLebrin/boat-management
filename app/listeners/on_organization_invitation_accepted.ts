import type OrganizationInvitationAccepted from '#events/organization_invitation_accepted'
import NotificationService from '#services/notification_service'
import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'

@inject()
export default class OnOrganizationInvitationAccepted {
  constructor(private notificationService: NotificationService) {}

  async handle(event: OrganizationInvitationAccepted) {
    // Rien à notifier si l'invitation n'a pas d'invitant connu.
    if (!event.invitedByUserId) return

    const locale = i18nManager.locale(i18nManager.defaultLocale)

    await this.notificationService.create({
      userId: event.invitedByUserId,
      organizationId: event.organization.id,
      type: 'invitation.accepted',
      severity: 'success',
      title: locale.formatMessage('notifications.messages.invitation.accepted.title', {
        memberName: event.memberName,
      }),
      body: null,
      actionUrl: '/settings/members',
      metadata: null,
    })
  }
}
