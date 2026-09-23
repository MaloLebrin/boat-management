import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Suites d'un incident (#815) : une tâche de maintenance ou une action
 * équipement peut être créée depuis un incident et le tracer par
 * `boat_incident_id` — même motif que `inspection_id` sur les actions (#311).
 * Supprimer l'incident conserve la suite, qui perd seulement son origine.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boat_maintenance_tasks', (table) => {
      table
        .integer('boat_incident_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boat_incidents')
        .onDelete('SET NULL')
        .index()
    })

    this.schema.alterTable('boat_equipment_actions', (table) => {
      table
        .integer('boat_incident_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boat_incidents')
        .onDelete('SET NULL')
        .index()
    })
  }

  async down() {
    this.schema.alterTable('boat_maintenance_tasks', (table) => {
      table.dropColumn('boat_incident_id')
    })

    this.schema.alterTable('boat_equipment_actions', (table) => {
      table.dropColumn('boat_incident_id')
    })
  }
}
