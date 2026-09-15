import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Une tâche peut viser n'importe quel équipement du bateau : on complète les
 * FK moteur / voile / gréement par la sécurité et l'équipement générique.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_maintenance_tasks'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('boat_safety_equipment_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boat_safety_equipment')
        .onDelete('SET NULL')
        .index()
      table
        .integer('boat_generic_equipment_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boat_generic_equipment')
        .onDelete('SET NULL')
        .index()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('boat_safety_equipment_id')
      table.dropColumn('boat_generic_equipment_id')
    })
  }
}
