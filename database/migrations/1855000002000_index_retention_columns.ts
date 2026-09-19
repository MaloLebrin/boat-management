import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Index des colonnes que balayent les purges de jetons (#775).
 *
 * Chaque purge est un `DELETE … WHERE expires_at < ?` sur une table qui n'a
 * aucun index sur cette colonne : sans eux, la purge quotidienne fait un
 * balayage complet, et son coût grandit avec la table qu'elle est censée
 * borner. Ces deux colonnes sont par ailleurs lues par les chemins de
 * vérification, pas seulement par la purge.
 *
 * `contact_messages.created_at` est déjà indexé (table d'origine), et les
 * deux colonnes ajoutées par les migrations voisines — `simulator_shares
 * .expires_at`, `simulator_leads.updated_at` — portent leur index avec elles.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('password_reset_tokens', (table) => {
      table.index(['expires_at'], 'password_reset_tokens_expires_at_index')
    })
    this.schema.alterTable('organization_invitations', (table) => {
      table.index(['expires_at'], 'organization_invitations_expires_at_index')
    })
  }

  async down() {
    this.schema.alterTable('password_reset_tokens', (table) => {
      table.dropIndex(['expires_at'], 'password_reset_tokens_expires_at_index')
    })
    this.schema.alterTable('organization_invitations', (table) => {
      table.dropIndex(['expires_at'], 'organization_invitations_expires_at_index')
    })
  }
}
