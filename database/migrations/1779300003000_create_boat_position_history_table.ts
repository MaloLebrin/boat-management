import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('boat_position_history', (table) => {
      table.increments('id').notNullable()
      table
        .integer('boat_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boats')
        .onDelete('CASCADE')
        .index()
      table
        .integer('pontoon_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('pontoons')
        .onDelete('SET NULL')
      table.string('spot_identifier', 16).nullable()
      table.timestamp('started_at').notNullable()
      table.timestamp('ended_at').nullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('boat_position_history')
  }
}
