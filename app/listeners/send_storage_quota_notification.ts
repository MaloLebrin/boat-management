import type StorageThresholdCrossed from '#events/storage_threshold_crossed'
import EmailQueueService from '#services/email_queue_service'
import NotificationService from '#services/notification_service'
import { BrandingService } from '#services/branding_service'
import OrganizationMembership from '#models/organization_membership'
import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'
import { DateTime } from 'luxon'

@inject()
export default class SendStorageQuotaNotification {
  constructor(
    private emailQueueService: EmailQueueService,
    private brandingService: BrandingService,
    private notificationService: NotificationService
  ) {}

  async handle(event: StorageThresholdCrossed) {
    const { organization: org, percent } = event

    const adminMemberships = await OrganizationMembership.query()
      .where('organizationId', org.id)
      .where('role', 'admin')
      .preload('user')

    if (adminMemberships.length === 0) return

    const yearMonth = DateTime.now().toFormat('yyyy-MM')
    const branding = this.brandingService.toEmailParams(org)

    await Promise.all(
      adminMemberships.map(async (membership) => {
        const locale = i18nManager.locale(i18nManager.defaultLocale)
        const params = { percent: String(percent), orgName: org.name }

        await this.emailQueueService.sendStorageQuotaWarning({
          to: membership.user.email,
          name: membership.user.fullName,
          percent,
          orgName: org.name,
          correlationSuffix: `${org.id}:${percent}:${yearMonth}`,
          branding,
        })

        await this.notificationService.create({
          userId: membership.user.id,
          organizationId: org.id,
          type: 'quota.storage',
          severity: percent >= 100 ? 'error' : 'warning',
          title: locale.formatMessage('notifications.messages.quota.storage.title', params),
          body: locale.formatMessage('notifications.messages.quota.storage.body', params),
          actionUrl: '/settings/billing',
          metadata: { percent, orgId: org.id },
        })
      })
    )
  }
}
