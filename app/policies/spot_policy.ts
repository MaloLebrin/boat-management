import type User from '#models/user'
import type Spot from '#models/spot'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

export default class SpotPolicy extends BasePolicy {
  async before(user: User) {
    if (user.organizationId && (await user.isAdminOf(user.organizationId))) {
      return true
    }
  }

  view(user: User, spot: Spot): AuthorizerResponse {
    return user.organizationId !== null && user.organizationId === spot.organizationId
  }

  create(user: User): AuthorizerResponse {
    return user.organizationId !== null
  }

  edit(user: User, spot: Spot): AuthorizerResponse {
    return user.organizationId !== null && user.organizationId === spot.organizationId
  }

  delete(_user: User, _spot: Spot): AuthorizerResponse {
    return false
  }
}
