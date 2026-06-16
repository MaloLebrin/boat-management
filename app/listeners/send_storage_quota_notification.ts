import type StorageThresholdCrossed from '#events/storage_threshold_crossed'
import EmailQueueService from '#services/email_queue_service'
import OrganizationMembership from '#models/organization_membership'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

@inject()
export default class SendStorageQuotaNotification {
  constructor(private emailQueueService: EmailQueueService) {}

  async handle(event: StorageThresholdCrossed) {
    const { organization: org, percent } = event

    const adminMemberships = await OrganizationMembership.query()
      .where('organizationId', org.id)
      .where('role', 'admin')
      .preload('user')

    if (adminMemberships.length === 0) return

    const yearMonth = DateTime.now().toFormat('yyyy-MM')

    for (const membership of adminMemberships) {
      await this.emailQueueService.sendStorageQuotaWarning({
        to: membership.user.email,
        name: membership.user.fullName,
        percent,
        orgName: org.name,
        correlationSuffix: `${org.id}:${percent}:${yearMonth}`,
      })
    }
  }
}
