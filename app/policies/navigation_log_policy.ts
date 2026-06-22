import type Boat from '#models/boat'
import type User from '#models/user'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

export default class NavigationLogPolicy extends BasePolicy {
  async before(user: User) {
    if (user.organizationId && (await user.isAdminOf(user.organizationId))) {
      return true
    }
  }

  create(user: User, boat: Boat): AuthorizerResponse {
    return user.organizationId !== null && user.organizationId === boat.organizationId
  }

  // Intentionally false: only admins may delete, handled by the before() hook above.
  delete(_user: User, _boat: Boat): AuthorizerResponse {
    return false
  }
}
