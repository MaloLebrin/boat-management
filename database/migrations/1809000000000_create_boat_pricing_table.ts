import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_pricing'

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
        .integer('boat_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boats')
        .onDelete('CASCADE')
        .unique()

      table.decimal('base_daily_price', 10, 2).notNullable()
      table.decimal('base_weekly_price', 10, 2).nullable()
      table.decimal('deposit_amount', 10, 2).nullable()
      table.integer('min_days').nullable()
      table.integer('max_days').nullable()
      table.string('currency', 3).notNullable().defaultTo('EUR')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['organization_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
