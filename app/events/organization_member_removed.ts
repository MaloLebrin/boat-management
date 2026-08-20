import type Organization from '#models/organization'
import { BaseEvent } from '@adonisjs/core/events'

/**
 * Émis après commit quand un membre est retiré de l'organisation. Le listener
 * notifie les admins restants et l'utilisateur retiré. L'identité du membre est
 * portée en scalaire car sa ligne `organization_memberships` est déjà supprimée.
 */
export default class OrganizationMemberRemoved extends BaseEvent {
  constructor(
    public readonly organization: Organization,
    public readonly userId: number,
    public readonly memberName: string
  ) {
    super()
  }
}
