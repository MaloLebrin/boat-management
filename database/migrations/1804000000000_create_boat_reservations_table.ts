import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_reservations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('boat_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boats')
        .onDelete('CASCADE')
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      // TODO: add client_id FK when CRM module (future) is implemented
      table.string('status', 20).notNullable().defaultTo('option')
      table.datetime('starts_at').notNullable()
      table.datetime('ends_at').notNullable()
      table.string('client_name', 255).notNullable()
      table.string('client_email', 255).nullable()
      table.string('client_phone', 50).nullable()
      table.text('notes').nullable()
      table.decimal('total_price', 10, 2).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['boat_id', 'starts_at', 'ends_at', 'status'], 'boat_reservations_overlap_idx')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
