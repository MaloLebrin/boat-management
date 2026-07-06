import type User from '#models/user'
import type Spot from '#models/spot'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

export default class SpotPolicy extends OrgScopedPolicy {
  async view(user: User, spot: Spot): Promise<AuthorizerResponse> {
    return this.sameOrg(user, spot) && (await this.can(user, 'spots.view'))
  }

  async create(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'spots.create')
  }

  async edit(user: User, spot: Spot): Promise<AuthorizerResponse> {
    return this.sameOrg(user, spot) && (await this.can(user, 'spots.edit'))
  }

  async delete(user: User, spot: Spot): Promise<AuthorizerResponse> {
    return this.sameOrg(user, spot) && (await this.can(user, 'spots.delete'))
  }
}
