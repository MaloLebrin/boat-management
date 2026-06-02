import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boat_maintenance_parts', (table) => {
      table
        .integer('engine_part_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boat_engine_parts')
        .onDelete('SET NULL')
        .index()
    })
  }

  async down() {
    this.schema.alterTable('boat_maintenance_parts', (table) => {
      table.dropColumn('engine_part_id')
    })
  }
}
