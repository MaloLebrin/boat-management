import type User from '#models/user'
import type Boat from '#models/boat'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

export default class IncidentPolicy extends OrgScopedPolicy {
  async view(user: User, boat: Boat): Promise<AuthorizerResponse> {
    return this.sameOrg(user, boat) && (await this.can(user, 'incidents.view'))
  }

  async create(user: User, boat: Boat): Promise<AuthorizerResponse> {
    return this.sameOrg(user, boat) && (await this.can(user, 'incidents.create'))
  }

  async edit(user: User, boat: Boat): Promise<AuthorizerResponse> {
    return this.sameOrg(user, boat) && (await this.can(user, 'incidents.edit'))
  }

  async delete(user: User, boat: Boat): Promise<AuthorizerResponse> {
    return this.sameOrg(user, boat) && (await this.can(user, 'incidents.delete'))
  }
}
