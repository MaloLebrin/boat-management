import OrganizationMembership from '#models/organization_membership'
import type User from '#models/user'
import { UserFactory } from '#database/factories/user_factory'

/**
 * Creates a user with admin membership in their organization.
 * Required for operations that are guarded by policies checking admin role
 * (BoatPolicy.delete, MaintenancePolicy.delete, etc.).
 */
export async function createAdminUser(): Promise<User> {
  const user = await UserFactory.with('organization', 1, (org) =>
    org.merge({ plan: 'pro' })
  ).create()
  if (user.organizationId) {
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: user.organizationId,
      role: 'admin',
    })
  }
  return user
}

/**
 * Creates a user with a plain `member` membership in the given organization.
 * Used to assert admin-only policies reject non-admin members.
 */
export async function createMemberUser(organizationId: number): Promise<User> {
  const member = await UserFactory.merge({ organizationId }).create()
  await OrganizationMembership.create({ userId: member.id, organizationId, role: 'member' })
  return member
}

/**
 * Creates a user with a `mechanic` membership in the given organization.
 * Mechanics have org-wide access to the maintenance module only.
 */
export async function createMechanicUser(organizationId: number): Promise<User> {
  const mechanic = await UserFactory.merge({ organizationId }).create()
  await OrganizationMembership.create({ userId: mechanic.id, organizationId, role: 'mechanic' })
  return mechanic
}

/**
 * Creates a user with a `boat_owner` membership in the given organization.
 * Boat owners are read-only and scoped to boats they are attached to via the
 * `boat_owners` pivot table (see `Boat.owners` / `User.ownedBoats`).
 */
export async function createBoatOwnerUser(organizationId: number): Promise<User> {
  const owner = await UserFactory.merge({ organizationId }).create()
  await OrganizationMembership.create({ userId: owner.id, organizationId, role: 'boat_owner' })
  return owner
}
