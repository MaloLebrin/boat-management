import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Qui a déclaré l'incident (#816) : la table ne le retenait pas, ni pour la
 * déclaration manuelle ni pour celle du copilote. Nullable en `SET NULL` — un
 * compte supprimé ne fait pas disparaître l'incident, les lignes existantes
 * restent sans auteur.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_incidents'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('created_by')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .index()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('created_by')
    })
  }
}
