import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_generic_equipment'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('purchase_price', 10, 2).nullable()
      table.date('purchased_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('purchase_price')
      table.dropColumn('purchased_at')
    })
  }
}
