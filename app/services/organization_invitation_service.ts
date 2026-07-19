import Organization from '#models/organization'
import OrganizationInvitation from '#models/organization_invitation'
import OrganizationMembership from '#models/organization_membership'
import Boat from '#models/boat'
import User from '#models/user'
import OrganizationInvitationAccepted from '#events/organization_invitation_accepted'
import OrganizationMemberJoined from '#events/organization_member_joined'
import {
  AlreadyMemberError,
  BoatOwnerInvitationRequiresBoatsError,
  InvalidInvitationBoatsError,
  InvitationAlreadyAcceptedError,
  InvitationEmailMismatchError,
  InvitationExpiredError,
  InvitationNotFoundError,
} from '#exceptions/organization_errors'
import type { OrganizationInvitationData, OrgRole } from '#shared/types/organization'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
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
      boatIds: inv.boatIds,
    }))
  }

  /**
   * Creates a new invitation.
   * Cancels any existing pending invitation for the same email/org before creating a new one.
   * Throws AlreadyMemberError if the email is already a member.
   * Returns the invitation data and the plain token (to be sent via email).
   */
  async create(
    orgId: number,
    invitedById: number,
    email: string,
    role: OrgRole,
    boatIds?: number[]
  ): Promise<{ invitation: OrganizationInvitationData; plainToken: string }> {
    if (role === 'boat_owner') {
      if (!boatIds || boatIds.length === 0) {
        throw new BoatOwnerInvitationRequiresBoatsError()
      }

      const matchingBoatsCount = await Boat.query()
        .where('organizationId', orgId)
        .whereIn('id', boatIds)
        .count('* as total')

      if (Number(matchingBoatsCount[0].$extras.total) !== boatIds.length) {
        throw new InvalidInvitationBoatsError()
      }
    }

    // Check if already a member — either via a membership row, or via a user
    // already attached to the organisation that may not have a membership row
    // (e.g. the org owner, cf. A-03/A-04). Both signals are checked because a
    // membership can exist without `users.organizationId` pointing here
    // (multi-org), and a user can belong to the org without a membership row.
    const existingMembership = await OrganizationMembership.query()
      .where('organizationId', orgId)
      .whereHas('user', (query) => {
        query.where('email', email)
      })
      .first()

    const existingOrgUser = await User.query()
      .where('email', email)
      .where('organizationId', orgId)
      .first()

    if (existingMembership || existingOrgUser) {
      throw new AlreadyMemberError()
    }

    // Cancel any existing pending invitation for this email before creating a new one
    await OrganizationInvitation.query()
      .where('organizationId', orgId)
      .where('email', email)
      .where('status', 'pending')
      .update({ status: 'cancelled' })

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
      boatIds: role === 'boat_owner' ? boatIds! : null,
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
        boatIds: invitation.boatIds,
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
   * Declines an invitation by token (sets status to 'cancelled').
   * Throws InvitationNotFoundError if not found.
   * Throws InvitationAlreadyAcceptedError if already accepted or cancelled.
   * Throws InvitationExpiredError if expired.
   */
  async decline(plainToken: string): Promise<void> {
    const invitation = await this.verifyToken(plainToken)
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

    const membership = await db.transaction(async (trx) => {
      const created = await OrganizationMembership.create(
        {
          userId,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
        { client: trx }
      )

      user.organizationId = invitation.organizationId
      await user.useTransaction(trx).save()

      invitation.status = 'accepted'
      invitation.acceptedAt = DateTime.now()
      await invitation.useTransaction(trx).save()

      if (invitation.role === 'boat_owner' && invitation.boatIds?.length) {
        // Raw query builder insert — bypasses the Lucid model's camelCase→snake_case
        // naming strategy, so columns must be spelled out as they exist in the table.
        const rows = invitation.boatIds.map((boatId) => ({
          boat_id: boatId,
          user_id: userId,
          created_at: DateTime.now().toSQL(),
        }))
        await trx.table('boat_owners').insert(rows)
      }

      return created
    })

    // Dispatch après commit : les listeners écrivent des notifications et
    // envoient des emails, ils ne doivent jamais s'appuyer sur une transaction
    // encore annulable.
    const organization = await Organization.findOrFail(invitation.organizationId)
    const memberName = user.fullName ?? user.email
    await OrganizationMemberJoined.dispatch(membership, organization)
    await OrganizationInvitationAccepted.dispatch(organization, invitation.invitedById, memberName)

    return invitation
  }
}
