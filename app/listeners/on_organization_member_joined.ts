import type OrganizationMemberJoined from '#events/organization_member_joined'
import NotificationService from '#services/notification_service'
import OrganizationMembership from '#models/organization_membership'
import logger from '@adonisjs/core/services/logger'
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

    for (const admin of adminMemberships) {
      if (admin.userId === event.member.userId) continue // ne pas notifier le membre lui-même si admin
      await this.notificationService.create({
        userId: admin.user.id,
        organizationId: event.organization.id,
        type: 'member.joined',
        severity: 'info',
        title: `${memberName} a rejoint l'organisation`,
        body: null,
        actionUrl: '/settings/members',
        metadata: { memberId: event.member.id },
      })
    }
  }
}
