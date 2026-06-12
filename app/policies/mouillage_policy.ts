import type User from '#models/user'
import type Mouillage from '#models/mouillage'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

export default class MouillagePolicy extends BasePolicy {
  async before(user: User) {
    if (user.organizationId && (await user.isAdminOf(user.organizationId))) {
      return true
    }
  }

  view(user: User, mouillage: Mouillage): AuthorizerResponse {
    return (
      user.organizationId !== null &&
      mouillage.port !== undefined &&
      user.organizationId === mouillage.port.organizationId
    )
  }

  create(_user: User): AuthorizerResponse {
    return false
  }

  edit(_user: User, _mouillage: Mouillage): AuthorizerResponse {
    return false
  }

  delete(_user: User, _mouillage: Mouillage): AuthorizerResponse {
    return false
  }
}
