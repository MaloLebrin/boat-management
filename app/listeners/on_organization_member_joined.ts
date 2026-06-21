import type OrganizationMemberJoined from '#events/organization_member_joined'
import NotificationService from '#services/notification_service'
import OrganizationMembership from '#models/organization_membership'
import logger from '@adonisjs/core/services/logger'
import i18nManager from '@adonisjs/i18n/services/main'
import { inject } from '@adonisjs/core'

@inject()
export default class OnOrganizationMemberJoined {
  constructor(private notificationService: NotificationService) {}

  async handle(event: OrganizationMemberJoined) {
    logger.info(
      { memberId: event.member.id, organizationId: event.organization.id },
      'member joined org'
    )

    await event.member.load('user')
    const memberName = event.member.user.fullName ?? event.member.user.email

    const adminMemberships = await OrganizationMembership.query()
      .where('organizationId', event.organization.id)
      .where('role', 'admin')
      .preload('user')

    const locale = i18nManager.locale(i18nManager.defaultLocale)

    await Promise.all(
      adminMemberships
        .filter((admin) => admin.userId !== event.member.userId)
        .map((admin) =>
          this.notificationService.create({
            userId: admin.user.id,
            organizationId: event.organization.id,
            type: 'member.joined',
            severity: 'info',
            title: locale.formatMessage('notifications.messages.member.joined.title', {
              memberName,
            }),
            body: null,
            actionUrl: '/settings/members',
            metadata: { memberId: event.member.id },
          })
        )
    )
  }
}
