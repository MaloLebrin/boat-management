import OrganizationInvitation from '#models/organization_invitation'
import OrganizationMembership from '#models/organization_membership'
import User from '#models/user'
import {
  AlreadyMemberError,
  InvitationAlreadyAcceptedError,
  InvitationAlreadyExistsError,
  InvitationEmailMismatchError,
  InvitationExpiredError,
  InvitationNotFoundError,
} from '#exceptions/organization_errors'
import type { OrganizationInvitationData, OrgRole } from '#shared/types/organization'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import { createHash, randomBytes } from 'node:crypto'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

@inject()
export default class OrganizationInvitationService {
  /**
   * Lists pending, non-expired invitations for an organization.
   */
  async listPending(orgId: number): Promise<OrganizationInvitationData[]> {
    const invitations = await OrganizationInvitation.query()
      .where('organizationId', orgId)
      .where('status', 'pending')
      .where('expiresAt', '>', DateTime.now().toSQL())
      .preload('invitedBy')
      .orderBy('created_at', 'desc')

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      invitedByName: inv.invitedBy?.fullName ?? null,
      expiresAt: inv.expiresAt.toISO()!,
      createdAt: inv.createdAt.toISO()!,
    }))
  }

  /**
   * Creates a new invitation.
   * Throws InvitationAlreadyExistsError if a pending invitation already exists for this email in this org.
   * Returns the invitation data and the plain token (to be sent via email).
   */
  async create(
    orgId: number,
    invitedById: number,
    email: string,
    role: OrgRole
  ): Promise<{ invitation: OrganizationInvitationData; plainToken: string }> {
    // Check if already a member
    const existingMembership = await OrganizationMembership.query()
      .where('organizationId', orgId)
      .whereHas('user', (query) => {
        query.where('email', email)
      })
      .first()

    if (existingMembership) {
      throw new AlreadyMemberError()
    }

    // Check for existing pending invitation
    const existingInvitation = await OrganizationInvitation.query()
      .where('organizationId', orgId)
      .where('email', email)
      .where('status', 'pending')
      .where('expiresAt', '>', DateTime.now().toSQL())
      .first()

    if (existingInvitation) {
      throw new InvitationAlreadyExistsError()
    }

    const plainToken = randomBytes(64).toString('hex')
    const tokenHash = sha256(plainToken)
    const expiresAt = DateTime.now().plus({ days: 7 })

    const invitation = await OrganizationInvitation.create({
      organizationId: orgId,
      invitedById,
      email,
      role,
      token: tokenHash,
      status: 'pending',
      expiresAt,
    })

    await invitation.load('invitedBy')

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        invitedByName: invitation.invitedBy?.fullName ?? null,
        expiresAt: invitation.expiresAt.toISO()!,
        createdAt: invitation.createdAt.toISO()!,
      },
      plainToken,
    }
  }

  /**
   * Cancels an invitation (sets status to 'cancelled').
   */
  async cancel(invitationId: number, orgId: number): Promise<void> {
    const invitation = await OrganizationInvitation.query()
      .where('id', invitationId)
      .where('organizationId', orgId)
      .first()

    if (!invitation) {
      throw new InvitationNotFoundError()
    }

    invitation.status = 'cancelled'
    await invitation.save()
  }

  /**
   * Verifies a plain token and returns the invitation.
   * Throws InvitationNotFoundError if not found.
   * Throws InvitationExpiredError if expired.
   * Throws InvitationAlreadyAcceptedError if not pending.
   */
  async verifyToken(plainToken: string): Promise<OrganizationInvitation> {
    const tokenHash = sha256(plainToken)
    const invitation = await OrganizationInvitation.query()
      .where('token', tokenHash)
      .preload('organization')
      .preload('invitedBy')
      .first()

    if (!invitation) {
      throw new InvitationNotFoundError()
    }

    if (invitation.status !== 'pending') {
      throw new InvitationAlreadyAcceptedError()
    }

    if (invitation.expiresAt < DateTime.now()) {
      throw new InvitationExpiredError()
    }

    return invitation
  }

  /**
   * Accepts an invitation: creates membership and updates invitation status.
   * Throws InvitationAlreadyAcceptedError if already accepted or cancelled.
   * Throws InvitationExpiredError if expired.
   * Throws AlreadyMemberError if user is already a member.
   */
  async accept(plainToken: string, userId: number): Promise<OrganizationInvitation> {
    const invitation = await this.verifyToken(plainToken)

    const user = await User.findOrFail(userId)

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new InvitationEmailMismatchError()
    }

    // Check if user is already a member
    const existingMembership = await OrganizationMembership.query()
      .where('userId', userId)
      .where('organizationId', invitation.organizationId)
      .first()

    if (existingMembership) {
      throw new AlreadyMemberError()
    }

    // Create membership
    await OrganizationMembership.create({
      userId,
      organizationId: invitation.organizationId,
      role: invitation.role,
    })

    // Update invitation
    invitation.status = 'accepted'
    invitation.acceptedAt = DateTime.now()
    await invitation.save()

    return invitation
  }
}
