import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boat_engine_parts', (table) => {
      table.integer('min_stock_alert').unsigned().nullable()
    })
  }

  async down() {
    this.schema.alterTable('boat_engine_parts', (table) => {
      table.dropColumn('min_stock_alert')
    })
  }
}
