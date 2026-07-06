import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_reservations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('client_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('clients')
        .onDelete('SET NULL')

      table.index(['client_id'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['client_id'])
      table.dropForeign(['client_id'])
      table.dropColumn('client_id')
    })
  }
}
