import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Registre des sessions et appareils connectés (#885).
 *
 * Le store de session reste celui de `SESSION_DRIVER` (cookie en production) :
 * cette table n'en stocke pas le contenu, elle **recense** les sessions
 * authentifiées pour pouvoir les lister et en couper une seule.
 *
 * - `id` : identifiant opaque (UUID) posé dans la session au login ; une
 *   session dont la ligne est révoquée (ou absente) est déconnectée à sa
 *   requête suivante.
 * - `remember_me_token_id` : le remember-me émis avec la session, supprimé à
 *   la révocation — sinon le cookie rouvrirait aussitôt une session.
 *   `SET NULL` : un jeton expiré ou recyclé ne doit pas emporter la ligne.
 * - `users.notify_new_login` : e-mail « nouvelle connexion » depuis un
 *   appareil inconnu, désactivable.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('user_sessions', (table) => {
      table.uuid('id').primary()
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('remember_me_token_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('remember_me_tokens')
        .onDelete('SET NULL')
      table.string('ip_address', 45).nullable()
      table.string('user_agent', 512).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('last_seen_at').notNullable()
      table.timestamp('revoked_at').nullable()

      table.index(['user_id', 'revoked_at'])
      table.index(['remember_me_token_id'])
    })

    this.schema.alterTable('users', (table) => {
      table.boolean('notify_new_login').notNullable().defaultTo(true)
    })
  }

  async down() {
    this.schema.alterTable('users', (table) => {
      table.dropColumn('notify_new_login')
    })
    this.schema.dropTable('user_sessions')
  }
}
