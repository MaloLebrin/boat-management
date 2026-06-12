import type OrganizationMemberJoined from '#events/organization_member_joined'
import logger from '@adonisjs/core/services/logger'

export default class OnOrganizationMemberJoined {
  async handle(event: OrganizationMemberJoined) {
    logger.info(
      { memberId: event.member.id, organizationId: event.organization.id },
      'member joined org'
    )
  }
}
