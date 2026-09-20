import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Jetons de vérification d'adresse (#768).
 *
 * Même moule que `password_reset_tokens` : jeton en clair envoyé par e-mail,
 * **hash SHA-256 stocké**, expiration. La table n'existait pas — il n'y avait
 * aucun flux de vérification dans le code.
 *
 * `email` n'est pas une clé étrangère vers `users`, comme pour les jetons de
 * réinitialisation : le lien se fait par l'adresse, et une adresse peut avoir
 * un jeton en vol sans que la ligne `users` bouge.
 */
export default class extends BaseSchema {
  protected tableName = 'email_verification_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('email', 254).notNullable().index()
      table.string('token', 128).notNullable().unique()
      table.timestamp('expires_at').notNullable().index()
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
