import type OrganizationMemberRoleChanged from '#events/organization_member_role_changed'
import NotificationService from '#services/notification_service'
import OrganizationMembership from '#models/organization_membership'
import logger from '@adonisjs/core/services/logger'
import i18nManager from '@adonisjs/i18n/services/main'
import { inject } from '@adonisjs/core'

@inject()
export default class OnOrganizationMemberRoleChanged {
  constructor(private notificationService: NotificationService) {}

  async handle(event: OrganizationMemberRoleChanged) {
    logger.info(
      {
        userId: event.userId,
        organizationId: event.organization.id,
        fromRole: event.fromRole,
        toRole: event.toRole,
      },
      'member role changed'
    )

    const locale = i18nManager.locale(i18nManager.defaultLocale)
    const fromRole = locale.formatMessage(`notifications.messages.member.roles.${event.fromRole}`)
    const toRole = locale.formatMessage(`notifications.messages.member.roles.${event.toRole}`)
    const metadata = { fromRole: event.fromRole, toRole: event.toRole }

    const adminMemberships = await OrganizationMembership.query()
      .where('organizationId', event.organization.id)
      .where('role', 'admin')
      .preload('user')

    // Membre concerné (2ᵉ personne) + admins (hors membre concerné) : toutes les
    // notifications sont créées en parallèle.
    await Promise.all([
      this.notificationService.create({
        userId: event.userId,
        organizationId: event.organization.id,
        type: 'member.role_changed',
        severity: 'info',
        title: locale.formatMessage('notifications.messages.member.role_changed.titleSelf'),
        body: locale.formatMessage('notifications.messages.member.role_changed.bodySelf', {
          fromRole,
          toRole,
        }),
        actionUrl: '/settings/members',
        metadata,
      }),
      ...adminMemberships
        .filter((admin) => admin.userId !== event.userId)
        .map((admin) =>
          this.notificationService.create({
            userId: admin.user.id,
            organizationId: event.organization.id,
            type: 'member.role_changed',
            severity: 'info',
            title: locale.formatMessage('notifications.messages.member.role_changed.title', {
              memberName: event.memberName,
            }),
            body: locale.formatMessage('notifications.messages.member.role_changed.body', {
              memberName: event.memberName,
              fromRole,
              toRole,
            }),
            actionUrl: '/settings/members',
            metadata,
          })
        ),
    ])
  }
}
