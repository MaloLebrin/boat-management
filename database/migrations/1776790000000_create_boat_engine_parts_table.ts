import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('boat_engine_parts', (table) => {
      table.increments('id').notNullable()
      table
        .integer('boat_engine_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boat_engines')
        .onDelete('CASCADE')
      table.string('designation').notNullable()
      table.string('reference').nullable()
      table.integer('stock').unsigned().nullable()
      table.string('supplier').nullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('boat_engine_parts')
  }
}
