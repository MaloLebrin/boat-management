import type User from '#models/user'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

export default class OrganizationPolicy extends BasePolicy {
  async before(user: User) {
    if (user.organizationId && (await user.isAdminOf(user.organizationId))) {
      return true
    }
  }

  viewMembers(user: User): AuthorizerResponse {
    return user.organizationId !== null
  }

  manageMembers(_user: User): AuthorizerResponse {
    return false
  }

  configureAI(_user: User): AuthorizerResponse {
    return false
  }

  viewAuditLog(user: User): AuthorizerResponse {
    return user.organizationId !== null
  }
}
