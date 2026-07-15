import type OrganizationPlanUpgraded from '#events/organization_plan_upgraded'
import NotificationService from '#services/notification_service'
import OrganizationMembership from '#models/organization_membership'
import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'

@inject()
export default class OnOrganizationPlanUpgraded {
  constructor(private notificationService: NotificationService) {}

  async handle(event: OrganizationPlanUpgraded) {
    const adminMemberships = await OrganizationMembership.query()
      .where('organizationId', event.organization.id)
      .where('role', 'admin')
      .preload('user')

    const locale = i18nManager.locale(i18nManager.defaultLocale)
    const params = { fromPlan: event.fromPlan, toPlan: event.toPlan }

    await Promise.all(
      adminMemberships.map((membership) =>
        this.notificationService.create({
          userId: membership.user.id,
          organizationId: event.organization.id,
          type: 'plan.upgraded',
          severity: 'success',
          title: locale.formatMessage('notifications.messages.plan.upgraded.title', params),
          body: locale.formatMessage('notifications.messages.plan.upgraded.body', params),
          actionUrl: '/settings/billing',
          metadata: { fromPlan: event.fromPlan, toPlan: event.toPlan },
        })
      )
    )
  }
}
