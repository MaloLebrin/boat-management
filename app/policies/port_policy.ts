import type User from '#models/user'
import type Port from '#models/port'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

export default class PortPolicy extends BasePolicy {
  async before(user: User) {
    if (user.organizationId && (await user.isAdminOf(user.organizationId))) {
      return true
    }
  }

  view(user: User, port: Port): AuthorizerResponse {
    return user.organizationId !== null && user.organizationId === port.organizationId
  }

  create(_user: User): AuthorizerResponse {
    return false
  }

  edit(_user: User, _port: Port): AuthorizerResponse {
    return false
  }

  delete(_user: User, _port: Port): AuthorizerResponse {
    return false
  }
}
