import type OrganizationModuleDeactivated from '#events/organization_module_deactivated'
import EmailQueueService from '#services/email_queue_service'
import NotificationService from '#services/notification_service'
import { BrandingService } from '#services/branding_service'
import OrganizationMembership from '#models/organization_membership'
import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'

@inject()
export default class OnOrganizationModuleDeactivated {
  constructor(
    private emailQueueService: EmailQueueService,
    private brandingService: BrandingService,
    private notificationService: NotificationService
  ) {}

  async handle(event: OrganizationModuleDeactivated) {
    const adminMemberships = await OrganizationMembership.query()
      .where('organizationId', event.organization.id)
      .where('role', 'admin')
      .preload('user')

    const branding = this.brandingService.toEmailParams(event.organization)
    const locale = i18nManager.locale(i18nManager.defaultLocale)
    const moduleName = locale.formatMessage(`notifications.messages.module.names.${event.module}`)
    const params = { module: moduleName }

    await Promise.all(
      adminMemberships.map(async (membership) => {
        await this.emailQueueService.sendModuleDeactivatedNotification({
          to: membership.user.email,
          name: membership.user.fullName,
          orgName: event.organization.name,
          orgId: event.organization.id,
          module: event.module,
          moduleName,
          branding,
        })

        await this.notificationService.create({
          userId: membership.user.id,
          organizationId: event.organization.id,
          type: 'module.deactivated',
          severity: 'warning',
          title: locale.formatMessage('notifications.messages.module.deactivated.title', params),
          body: locale.formatMessage('notifications.messages.module.deactivated.body', params),
          actionUrl: '/settings/billing',
          metadata: { module: event.module },
        })
      })
    )
  }
}
