import type User from '#models/user'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

export default class CrewMemberPolicy extends OrgScopedPolicy {
  async create(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'crew.create')
  }

  async update(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'crew.update')
  }

  async delete(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'crew.delete')
  }
}
