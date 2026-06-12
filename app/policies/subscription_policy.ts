import type User from '#models/user'
import type Subscription from '#models/subscription'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

export default class SubscriptionPolicy extends BasePolicy {
  async before(user: User) {
    if (user.organizationId && (await user.isAdminOf(user.organizationId))) {
      return true
    }
  }

  view(user: User, subscription: Subscription): AuthorizerResponse {
    return user.organizationId !== null && user.organizationId === subscription.organizationId
  }

  manage(_user: User, _subscription: Subscription): AuthorizerResponse {
    return false
  }
}
