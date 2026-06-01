import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boat_maintenance_parts', (table) => {
      table.decimal('unit_price', 10, 2).unsigned().nullable()
    })
  }

  async down() {
    this.schema.alterTable('boat_maintenance_parts', (table) => {
      table.dropColumn('unit_price')
    })
  }
}
