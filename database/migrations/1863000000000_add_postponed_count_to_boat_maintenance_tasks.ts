import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Nombre de reports d'une tâche planifiée (#867) : incrémenté à chaque fois que
 * son échéance (date ou heures moteur) recule. Une tâche reportée trois fois
 * est un signal pour les suggestions de l'assistant, pas un simple détail
 * d'affichage — d'où une colonne plutôt qu'une mention dans les notes.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_maintenance_tasks'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('postponed_count').notNullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('postponed_count')
    })
  }
}
