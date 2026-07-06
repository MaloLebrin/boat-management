import type User from '#models/user'
import type Boat from '#models/boat'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

export default class FuelLogPolicy extends OrgScopedPolicy {
  async create(user: User, boat: Boat): Promise<AuthorizerResponse> {
    return this.sameOrg(user, boat) && (await this.can(user, 'fuel_logs.create'))
  }

  async delete(user: User, boat: Boat): Promise<AuthorizerResponse> {
    return this.sameOrg(user, boat) && (await this.can(user, 'fuel_logs.delete'))
  }
}
