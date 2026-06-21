import type OrganizationPlanDowngraded from '#events/organization_plan_downgraded'
import EmailQueueService from '#services/email_queue_service'
import NotificationService from '#services/notification_service'
import { BrandingService } from '#services/branding_service'
import OrganizationMembership from '#models/organization_membership'
import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'

@inject()
export default class OnOrganizationPlanDowngraded {
  constructor(
    private emailQueueService: EmailQueueService,
    private brandingService: BrandingService,
    private notificationService: NotificationService
  ) {}

  async handle(event: OrganizationPlanDowngraded) {
    const adminMemberships = await OrganizationMembership.query()
      .where('organizationId', event.organization.id)
      .where('role', 'admin')
      .preload('user')

    const branding = this.brandingService.toEmailParams(event.organization)
    const locale = i18nManager.locale(i18nManager.defaultLocale)
    const params = { fromPlan: event.fromPlan, toPlan: event.toPlan }

    await Promise.all(
      adminMemberships.map(async (membership) => {
        await this.emailQueueService.sendPlanDowngradeNotification({
          to: membership.user.email,
          name: membership.user.fullName,
          orgName: event.organization.name,
          orgId: event.organization.id,
          fromPlan: event.fromPlan,
          toPlan: event.toPlan,
          branding,
        })

        await this.notificationService.create({
          userId: membership.user.id,
          organizationId: event.organization.id,
          type: 'plan.downgraded',
          severity: 'warning',
          title: locale.formatMessage('notifications.messages.plan.downgraded.title', params),
          body: locale.formatMessage('notifications.messages.plan.downgraded.body', params),
          actionUrl: '/settings/billing',
          metadata: { fromPlan: event.fromPlan, toPlan: event.toPlan },
        })
      })
    )
  }
}
