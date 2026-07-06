import type User from '#models/user'
import type Port from '#models/port'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

export default class PortPolicy extends OrgScopedPolicy {
  async view(user: User, port: Port): Promise<AuthorizerResponse> {
    return this.sameOrg(user, port) && (await this.can(user, 'ports.view'))
  }

  async create(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'ports.create')
  }

  async edit(user: User, port?: Port): Promise<AuthorizerResponse> {
    if (port && !this.sameOrg(user, port)) return false
    return this.can(user, 'ports.edit')
  }

  async delete(user: User, port?: Port): Promise<AuthorizerResponse> {
    if (port && !this.sameOrg(user, port)) return false
    return this.can(user, 'ports.delete')
  }
}
