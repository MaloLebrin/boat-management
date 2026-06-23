import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boat_position_history', (table) => {
      table.decimal('latitude', 10, 7).nullable()
      table.decimal('longitude', 10, 7).nullable()
      table.decimal('speed_knots', 5, 2).nullable()
      table.integer('heading_degrees').nullable()
      table.string('source', 10).notNullable().defaultTo('manual')
    })
  }

  async down() {
    this.schema.alterTable('boat_position_history', (table) => {
      table.dropColumn('latitude')
      table.dropColumn('longitude')
      table.dropColumn('speed_knots')
      table.dropColumn('heading_degrees')
      table.dropColumn('source')
    })
  }
}
