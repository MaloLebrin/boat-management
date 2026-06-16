import type OrganizationPlanDowngraded from '#events/organization_plan_downgraded'
import EmailQueueService from '#services/email_queue_service'
import OrganizationMembership from '#models/organization_membership'
import { inject } from '@adonisjs/core'

@inject()
export default class OnOrganizationPlanDowngraded {
  constructor(private emailQueueService: EmailQueueService) {}

  async handle(event: OrganizationPlanDowngraded) {
    const adminMemberships = await OrganizationMembership.query()
      .where('organizationId', event.organization.id)
      .where('role', 'admin')
      .preload('user')

    for (const membership of adminMemberships) {
      await this.emailQueueService.sendPlanDowngradeNotification({
        to: membership.user.email,
        name: membership.user.fullName,
        orgName: event.organization.name,
        orgId: event.organization.id,
        fromPlan: event.fromPlan,
        toPlan: event.toPlan,
      })
    }
  }
}
