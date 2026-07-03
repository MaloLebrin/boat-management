import OrganizationMembership from '#models/organization_membership'
import User from '#models/user'
import {
  AlreadyMemberError,
  LastAdminError,
  MemberNotFoundError,
  UserNotFoundError,
} from '#exceptions/organization_errors'
import type { OrgRole, OrganizationMemberData } from '#shared/types/organization'

export default class OrganizationMemberService {
  async listMembers(orgId: number): Promise<OrganizationMemberData[]> {
    await this.ensureMembershipsForOrgUsers(orgId)

    const memberships = await OrganizationMembership.query()
      .where('organizationId', orgId)
      .preload('user')
      .orderBy('created_at', 'asc')

    return memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      fullName: m.user.fullName,
      email: m.user.email,
      role: m.role,
    }))
  }

  /**
   * Ensures every user attached to the organization has a membership row.
   * The organization owner (and any user with `organizationId` set) must appear
   * in the members list, but the list is built from `organization_memberships`.
   * A user without a membership row — data drift, or an org owner created before
   * the membership backfill — would otherwise be invisible. This self-heals that
   * drift by creating the missing membership as 'admin'. Idempotent: the unique
   * (user_id, organization_id) constraint makes re-runs no-ops.
   */
  private async ensureMembershipsForOrgUsers(orgId: number): Promise<void> {
    const usersWithoutMembership = await User.query()
      .where('organizationId', orgId)
      .whereDoesntHave('memberships', (query) => {
        query.where('organizationId', orgId)
      })

    for (const user of usersWithoutMembership) {
      await OrganizationMembership.firstOrCreate(
        { userId: user.id, organizationId: orgId },
        { userId: user.id, organizationId: orgId, role: 'admin' }
      )
    }
  }

  async addMember(orgId: number, email: string, role: OrgRole): Promise<OrganizationMembership> {
    const user = await User.findBy('email', email)
    if (!user) throw new UserNotFoundError()

    const existing = await OrganizationMembership.query()
      .where('userId', user.id)
      .where('organizationId', orgId)
      .first()
    if (existing) throw new AlreadyMemberError()

    return OrganizationMembership.create({ userId: user.id, organizationId: orgId, role })
  }

  async updateRole(membershipId: number, orgId: number, role: OrgRole): Promise<void> {
    const membership = await OrganizationMembership.query()
      .where('id', membershipId)
      .where('organizationId', orgId)
      .first()
    if (!membership) throw new MemberNotFoundError()

    if (role !== 'admin' && membership.role === 'admin') {
      await this.ensureNotLastAdmin(orgId, membership.userId)
    }

    membership.role = role
    await membership.save()
  }

  async removeMember(membershipId: number, orgId: number): Promise<void> {
    const membership = await OrganizationMembership.query()
      .where('id', membershipId)
      .where('organizationId', orgId)
      .first()
    if (!membership) throw new MemberNotFoundError()

    if (membership.role === 'admin') {
      await this.ensureNotLastAdmin(orgId, membership.userId)
    }

    await membership.delete()
  }

  private async ensureNotLastAdmin(orgId: number, excludeUserId: number): Promise<void> {
    const adminCount = await OrganizationMembership.query()
      .where('organizationId', orgId)
      .where('role', 'admin')
      .whereNot('userId', excludeUserId)
      .count('* as total')

    const count = Number((adminCount[0] as any).$extras.total)
    if (count === 0) throw new LastAdminError()
  }
}
