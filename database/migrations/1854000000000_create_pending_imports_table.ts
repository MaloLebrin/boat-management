import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Imports CSV en attente de confirmation (#774).
 *
 * Les lignes à insérer transitaient par la **session** entre le `preview` et
 * le `confirm` — toutes les lignes, pas l'aperçu. Avec
 * `SESSION_DRIVER=cookie` (le défaut documenté dans `.env.example`), la
 * session est un cookie chiffré, et un cookie plafonne autour de 4 Ko côté
 * navigateur : quelques centaines de lignes suffisaient à le dépasser. Le
 * navigateur tronquait ou refusait le cookie, et l'utilisateur obtenait un
 * aperçu correct suivi d'un `confirm` qui ne trouvait rien à confirmer, sans
 * message expliquant pourquoi.
 *
 * Une ligne au plus par utilisateur : `user_id` est unique, et le `preview`
 * remplace l'attente précédente — c'est déjà la sémantique qu'avait
 * `session.put('pendingImport')`. La table ne peut donc pas croître, et
 * n'appelle aucun job de purge.
 */
export default class extends BaseSchema {
  protected tableName = 'pending_imports'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('boat_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boats')
        .onDelete('CASCADE')
      table.string('type', 32).notNullable()
      table.jsonb('rows').notNullable()
      table.timestamps(true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
