import type User from '#models/user'
import { BasePolicy } from '@adonisjs/bouncer'
import type { Capability } from '#shared/types/permissions'

export default abstract class OrgScopedPolicy extends BasePolicy {
  async before(user: User) {
    if (user.organizationId && (await user.isAdminOf(user.organizationId))) {
      return true
    }
  }

  protected async can(user: User, capability: Capability): Promise<boolean> {
    if (!user.organizationId) return false
    return user.hasPermission(user.organizationId, capability)
  }

  protected sameOrg(user: User, resource: { organizationId: number }): boolean {
    return user.organizationId !== null && user.organizationId === resource.organizationId
  }
}
