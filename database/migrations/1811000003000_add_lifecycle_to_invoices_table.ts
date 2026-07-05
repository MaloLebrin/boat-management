import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoices'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.date('paid_at').nullable()

      table
        .integer('source_quote_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('invoices')
        .onDelete('SET NULL')

      table.index(['source_quote_id'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['source_quote_id'])
      table.dropForeign(['source_quote_id'])
      table.dropColumn('source_quote_id')
      table.dropColumn('paid_at')
    })
  }
}
