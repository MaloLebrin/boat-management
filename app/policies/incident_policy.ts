import type User from '#models/user'
import type Boat from '#models/boat'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

export default class IncidentPolicy extends BasePolicy {
  async before(user: User) {
    if (user.organizationId && (await user.isAdminOf(user.organizationId))) {
      return true
    }
  }

  view(user: User, boat: Boat): AuthorizerResponse {
    return user.organizationId !== null && user.organizationId === boat.organizationId
  }

  create(user: User, boat: Boat): AuthorizerResponse {
    return user.organizationId !== null && user.organizationId === boat.organizationId
  }

  edit(user: User, boat: Boat): AuthorizerResponse {
    return user.organizationId !== null && user.organizationId === boat.organizationId
  }

  delete(user: User, boat: Boat): AuthorizerResponse {
    return user.organizationId !== null && user.organizationId === boat.organizationId
  }
}
