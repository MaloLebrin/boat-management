import type Organization from '#models/organization'
import type { OrgRole } from '#shared/types/organization'
import { BaseEvent } from '@adonisjs/core/events'

/**
 * Émis après commit quand le rôle d'un membre change. Le listener notifie le
 * membre concerné et les admins de l'organisation.
 */
export default class OrganizationMemberRoleChanged extends BaseEvent {
  constructor(
    public readonly organization: Organization,
    public readonly userId: number,
    public readonly memberName: string,
    public readonly fromRole: OrgRole,
    public readonly toRole: OrgRole
  ) {
    super()
  }
}
