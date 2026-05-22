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
