import type Boat from '#models/boat'
import type User from '#models/user'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

export default class NavigationLogPolicy extends OrgScopedPolicy {
  async create(user: User, boat: Boat): Promise<AuthorizerResponse> {
    return this.sameOrg(user, boat) && (await this.can(user, 'navigation_logs.create'))
  }

  async update(user: User, boat: Boat): Promise<AuthorizerResponse> {
    return this.sameOrg(user, boat) && (await this.can(user, 'navigation_logs.update'))
  }

  async delete(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'navigation_logs.delete')
  }
}
