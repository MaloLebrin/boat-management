import type OrganizationMemberRemoved from '#events/organization_member_removed'
import NotificationService from '#services/notification_service'
import OrganizationMembership from '#models/organization_membership'
import logger from '@adonisjs/core/services/logger'
import i18nManager from '@adonisjs/i18n/services/main'
import { inject } from '@adonisjs/core'

@inject()
export default class OnOrganizationMemberRemoved {
  constructor(private notificationService: NotificationService) {}

  async handle(event: OrganizationMemberRemoved) {
    logger.info(
      { removedUserId: event.userId, organizationId: event.organization.id },
      'member removed from org'
    )

    const adminMemberships = await OrganizationMembership.query()
      .where('organizationId', event.organization.id)
      .where('role', 'admin')
      .preload('user')

    const locale = i18nManager.locale(i18nManager.defaultLocale)

    // Admins restants
    await Promise.all(
      adminMemberships
        .filter((admin) => admin.userId !== event.userId)
        .map((admin) =>
          this.notificationService.create({
            userId: admin.user.id,
            organizationId: event.organization.id,
            type: 'member.removed',
            severity: 'warning',
            title: locale.formatMessage('notifications.messages.member.removed.title', {
              memberName: event.memberName,
            }),
            body: null,
            actionUrl: '/settings/members',
            metadata: { removedUserId: event.userId },
          })
        )
    )

    // Membre concerné (n'a plus accès à /settings/members → pas d'actionUrl)
    await this.notificationService.create({
      userId: event.userId,
      organizationId: event.organization.id,
      type: 'member.removed',
      severity: 'warning',
      title: locale.formatMessage('notifications.messages.member.removed.titleSelf', {
        orgName: event.organization.name,
      }),
      body: null,
      actionUrl: null,
      metadata: { removedUserId: event.userId },
    })
  }
}
