import type User from '#models/user'
import type Subscription from '#models/subscription'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

export default class SubscriptionPolicy extends OrgScopedPolicy {
  async view(user: User, subscription: Subscription): Promise<AuthorizerResponse> {
    return this.sameOrg(user, subscription) && (await this.can(user, 'subscription.view'))
  }

  async manage(user: User, subscription: Subscription): Promise<AuthorizerResponse> {
    return this.sameOrg(user, subscription) && (await this.can(user, 'subscription.manage'))
  }
}
