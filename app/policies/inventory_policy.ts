import type User from '#models/user'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

/**
 * Inventaire de pièces (#892) : articles, fournisseurs et bons de commande.
 * Les services scopent chaque lecture par organisation ; la policy ne juge
 * que le rôle.
 */
export default class InventoryPolicy extends OrgScopedPolicy {
  async view(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'inventory.view')
  }

  /** Créer, modifier, ajuster un stock, commander et réceptionner. */
  async manage(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'inventory.manage')
  }

  /** Supprimer un article (et son journal), un fournisseur ou un bon de commande. */
  async delete(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'inventory.delete')
  }
}
