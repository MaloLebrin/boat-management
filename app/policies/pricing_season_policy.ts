import type User from '#models/user'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

export default class PricingSeasonPolicy extends OrgScopedPolicy {
  async create(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'pricing_seasons.create')
  }

  async update(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'pricing_seasons.update')
  }

  async delete(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'pricing_seasons.delete')
  }
}
