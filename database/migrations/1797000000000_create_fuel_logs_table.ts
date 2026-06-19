import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_fuel_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

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

      table
        .integer('boat_engine_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boat_engines')
        .onDelete('SET NULL')

      table.date('fueled_at').notNullable().index()
      table.decimal('quantity_liters', 10, 3).notNullable()
      table.decimal('price_per_liter', 10, 4).nullable()
      table.decimal('total_cost', 10, 2).nullable()
      table.decimal('engine_hours_at_fueling', 10, 1).nullable()
      table.string('supplier').nullable()
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
