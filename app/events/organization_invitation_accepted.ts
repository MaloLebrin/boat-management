import type Organization from '#models/organization'
import { BaseEvent } from '@adonisjs/core/events'

/**
 * Émis après commit quand une invitation est acceptée. Le listener notifie
 * l'invitant (`invitedByUserId`) que son invitation a été acceptée.
 */
export default class OrganizationInvitationAccepted extends BaseEvent {
  constructor(
    public readonly organization: Organization,
    public readonly invitedByUserId: number | null,
    public readonly memberName: string
  ) {
    super()
  }
}
