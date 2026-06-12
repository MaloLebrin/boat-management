import type OrganizationMembership from '#models/organization_membership'
import type Organization from '#models/organization'
import { BaseEvent } from '@adonisjs/core/events'

export default class OrganizationMemberJoined extends BaseEvent {
  constructor(
    public readonly member: OrganizationMembership,
    public readonly organization: Organization
  ) {
    super()
  }
}
