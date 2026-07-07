import type User from '#models/user'
import type Boat from '#models/boat'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

export default class EquipmentActionPolicy extends OrgScopedPolicy {
  async view(user: User, boat: Boat): Promise<AuthorizerResponse> {
    return this.sameOrg(user, boat) && (await this.can(user, 'equipmentActions.view'))
  }

  async create(user: User, boat: Boat): Promise<AuthorizerResponse> {
    return this.sameOrg(user, boat) && (await this.can(user, 'equipmentActions.create'))
  }

  async edit(user: User, boat: Boat): Promise<AuthorizerResponse> {
    return this.sameOrg(user, boat) && (await this.can(user, 'equipmentActions.edit'))
  }

  async delete(user: User, boat: Boat): Promise<AuthorizerResponse> {
    return this.sameOrg(user, boat) && (await this.can(user, 'equipmentActions.delete'))
  }
}
