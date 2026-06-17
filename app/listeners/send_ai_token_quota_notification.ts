import type AiTokenThresholdCrossed from '#events/ai_token_threshold_crossed'
import EmailQueueService from '#services/email_queue_service'
import { BrandingService } from '#services/branding_service'
import OrganizationMembership from '#models/organization_membership'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

@inject()
export default class SendAiTokenQuotaNotification {
  constructor(
    private emailQueueService: EmailQueueService,
    private brandingService: BrandingService
  ) {}

  async handle(event: AiTokenThresholdCrossed) {
    const { organization: org, percent } = event

    const adminMemberships = await OrganizationMembership.query()
      .where('organizationId', org.id)
      .where('role', 'admin')
      .preload('user')

    if (adminMemberships.length === 0) return

    const yearMonth = DateTime.now().toFormat('yyyy-MM')

    const branding = this.brandingService.toEmailParams(org)
    for (const membership of adminMemberships) {
      await this.emailQueueService.sendAiTokenQuotaWarning({
        to: membership.user.email,
        name: membership.user.fullName,
        percent,
        orgName: org.name,
        correlationSuffix: `${org.id}:${percent}:${yearMonth}`,
        branding,
      })
    }
  }
}
