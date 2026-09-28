import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Ordres de travail (#868) : une tâche planifiée peut être confiée à un membre
 * de l'organisation (`assignee_id`) ou à un prestataire externe
 * (`provider_name`, champ libre en attendant un annuaire), avec un coût et une
 * durée prévus, puis réels à la clôture.
 *
 * `assignee_id` passe à `NULL` quand le compte est supprimé : la tâche reste,
 * seulement désassignée. Indexée pour le filtre « Mes tâches ».
 */
export default class extends BaseSchema {
  protected tableName = 'boat_maintenance_tasks'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('assignee_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .index()
      table.timestamp('assigned_at', { useTz: true }).nullable()
      table.string('provider_name', 200).nullable()
      table.decimal('estimated_cost', 10, 2).nullable()
      table.decimal('actual_cost', 10, 2).nullable()
      table.integer('estimated_duration_minutes').nullable()
      table.integer('actual_duration_minutes').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('assignee_id')
      table.dropColumn('assigned_at')
      table.dropColumn('provider_name')
      table.dropColumn('estimated_cost')
      table.dropColumn('actual_cost')
      table.dropColumn('estimated_duration_minutes')
      table.dropColumn('actual_duration_minutes')
    })
  }
}
