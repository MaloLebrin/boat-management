import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoices'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')

      table
        .integer('client_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('clients')
        .onDelete('SET NULL')

      table
        .integer('reservation_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boat_reservations')
        .onDelete('SET NULL')

      table.enu('kind', ['quote', 'invoice']).notNullable()
      table.string('number').notNullable()
      table.string('client_name').nullable()

      table
        .enu('status', ['draft', 'sent', 'paid', 'overdue', 'cancelled'])
        .notNullable()
        .defaultTo('draft')

      table.date('issued_at').notNullable()
      table.date('due_at').nullable()

      table.decimal('subtotal', 10, 2).notNullable()
      table.decimal('tax_rate', 5, 2).notNullable().defaultTo(0)
      table.decimal('tax_amount', 10, 2).notNullable()
      table.decimal('total', 10, 2).notNullable()

      table.string('currency', 3).notNullable().defaultTo('EUR')
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['organization_id', 'kind', 'number'])
      table.index(['organization_id', 'kind', 'status'])
      table.index(['organization_id', 'issued_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
