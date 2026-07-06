import type User from '#models/user'
import type Mouillage from '#models/mouillage'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

export default class MouillagePolicy extends OrgScopedPolicy {
  async view(user: User, mouillage: Mouillage): Promise<AuthorizerResponse> {
    const sameOrg =
      user.organizationId !== null &&
      mouillage.port !== undefined &&
      user.organizationId === mouillage.port.organizationId
    return sameOrg && (await this.can(user, 'mouillages.view'))
  }

  async create(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'mouillages.create')
  }

  async edit(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'mouillages.edit')
  }

  async delete(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'mouillages.delete')
  }
}
