import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_maintenance_events'

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
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('boat_safety_equipment_id')
    })
  }
}
