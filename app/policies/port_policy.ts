import type User from '#models/user'
import type Port from '#models/port'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

export default class PortPolicy extends OrgScopedPolicy {
  /**
   * Lecture de la liste : aucune ressource à passer, la capacité seule décide
   * (#723). Le scoping d'organisation est fait par `PortService.listForUser` —
   * ce qui manquait ici, c'est la frontière **entre rôles** d'une même
   * organisation.
   */
  async viewAny(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'ports.view')
  }

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
