import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'navigation_logs'

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

      table.enu('status', ['in_progress', 'completed']).notNullable().defaultTo('in_progress')

      table.dateTime('departed_at').notNullable().index()
      table.dateTime('arrived_at').nullable()

      table
        .integer('departure_port_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('ports')
        .onDelete('SET NULL')
      table.string('departure_port_name').nullable()

      table
        .integer('arrival_port_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('ports')
        .onDelete('SET NULL')
      table.string('arrival_port_name').nullable()

      table.decimal('distance_nm', 10, 2).nullable()
      table.decimal('engine_hours_start', 10, 1).nullable()
      table.decimal('engine_hours_end', 10, 1).nullable()
      table.decimal('fuel_consumed_liters', 10, 3).nullable()

      table.integer('wind_force_beaufort').nullable()
      table.enu('sea_state', ['calm', 'slight', 'moderate', 'rough', 'very_rough']).nullable()

      table.integer('crew_count').nullable()
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
