import type User from '#models/user'
import { ROLE_PERMISSIONS } from '#shared/types/permissions'
import type { PermissionsSharedProps } from '#shared/types/permissions'

export default class PermissionService {
  async sharedProps(user?: User | null): Promise<PermissionsSharedProps> {
    if (!user?.organizationId) {
      return { role: null, capabilities: [] }
    }

    const role = await user.getRoleInOrg(user.organizationId)
    if (!role) {
      return { role: null, capabilities: [] }
    }

    return { role, capabilities: [...ROLE_PERMISSIONS[role]] }
  }
}
