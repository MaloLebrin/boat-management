import type User from '#models/user'
import type Mouillage from '#models/mouillage'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

export default class MouillagePolicy extends OrgScopedPolicy {
  private sameOrgViaPort(user: User, mouillage: Mouillage): boolean {
    return (
      user.organizationId !== null &&
      mouillage.port !== undefined &&
      user.organizationId === mouillage.port.organizationId
    )
  }

  async view(user: User, mouillage: Mouillage): Promise<AuthorizerResponse> {
    return this.sameOrgViaPort(user, mouillage) && (await this.can(user, 'mouillages.view'))
  }

  async create(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'mouillages.create')
  }

  async edit(user: User, mouillage: Mouillage): Promise<AuthorizerResponse> {
    return this.sameOrgViaPort(user, mouillage) && (await this.can(user, 'mouillages.edit'))
  }

  async delete(user: User, mouillage: Mouillage): Promise<AuthorizerResponse> {
    return this.sameOrgViaPort(user, mouillage) && (await this.can(user, 'mouillages.delete'))
  }
}
