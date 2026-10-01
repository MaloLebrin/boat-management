import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Double authentification TOTP (#884).
 *
 * - `users.two_factor_secret` : secret TOTP **chiffré** (`ENCRYPTION_KEY`,
 *   comme les clés BYOK #786). Posé dès le début de l'activation ; la 2FA
 *   n'est active qu'une fois `two_factor_confirmed_at` renseigné.
 * - `users.two_factor_last_used_step` : dernier pas TOTP accepté — un code
 *   déjà consommé est refusé (anti-rejeu).
 * - `two_factor_recovery_codes` : codes de secours hachés (SHA-256), à usage
 *   unique.
 * - `organizations.require_two_factor` + `two_factor_grace_ends_at` :
 *   politique d'organisation et fin du délai de grâce.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.text('two_factor_secret').nullable()
      table.timestamp('two_factor_confirmed_at').nullable()
      table.bigInteger('two_factor_last_used_step').nullable()
    })

    this.schema.createTable('two_factor_recovery_codes', (table) => {
      table.increments('id').primary()
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .index()
      table.string('code_hash', 64).notNullable()
      table.timestamp('used_at').nullable()
      table.timestamp('created_at').notNullable()
    })

    this.schema.alterTable('organizations', (table) => {
      table.boolean('require_two_factor').notNullable().defaultTo(false)
      table.timestamp('two_factor_grace_ends_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable('organizations', (table) => {
      table.dropColumn('two_factor_grace_ends_at')
      table.dropColumn('require_two_factor')
    })
    this.schema.dropTable('two_factor_recovery_codes')
    this.schema.alterTable('users', (table) => {
      table.dropColumn('two_factor_last_used_step')
      table.dropColumn('two_factor_confirmed_at')
      table.dropColumn('two_factor_secret')
    })
  }
}
