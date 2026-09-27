import type User from '#models/user'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

export default class ClientPolicy extends OrgScopedPolicy {
  /**
   * Lecture d'une fiche client et de ses documents (#846). Il n'existe pas de
   * capability `clients.view` : la liste et la fiche ont toujours été gardées
   * par `clients.create`, et c'est ce seuil que reprend le téléchargement —
   * un document ne doit pas être plus accessible que la fiche qui l'affiche.
   */
  async view(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'clients.create')
  }

  async create(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'clients.create')
  }

  async update(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'clients.update')
  }

  async delete(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'clients.delete')
  }

  async anonymize(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'clients.anonymize')
  }
}
