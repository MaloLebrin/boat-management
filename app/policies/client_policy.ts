import type User from '#models/user'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

export default class ClientPolicy extends BasePolicy {
  async before(user: User) {
    if (user.organizationId && (await user.isAdminOf(user.organizationId))) {
      return true
    }
  }

  create(user: User): AuthorizerResponse {
    return user.organizationId !== null
  }

  update(user: User): AuthorizerResponse {
    return user.organizationId !== null
  }

  // Intentionally false: only admins may delete, handled by the before() hook above.
  delete(): AuthorizerResponse {
    return false
  }
}
