import OrganizationMembership from '#models/organization_membership'
import type User from '#models/user'
import { UserFactory } from '#database/factories/user_factory'

/**
 * Creates a user with admin membership in their organization.
 * Required for operations that are guarded by policies checking admin role
 * (BoatPolicy.delete, MaintenancePolicy.delete, etc.).
 */
export async function createAdminUser(): Promise<User> {
  const user = await UserFactory.with('organization').create()
  if (user.organizationId) {
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: user.organizationId,
      role: 'admin',
    })
  }
  return user
}
