import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoice_lines'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table
        .integer('invoice_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('invoices')
        .onDelete('CASCADE')

      table.string('label').notNullable()
      table.decimal('quantity', 10, 2).notNullable()
      table.decimal('unit_price', 10, 2).notNullable()
      table.decimal('amount', 10, 2).notNullable()
      table.integer('position').notNullable().defaultTo(0)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['invoice_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
